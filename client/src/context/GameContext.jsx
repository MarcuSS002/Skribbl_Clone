import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import socket from '../socket.js'
import { GameContext } from './GameContextObject.js'

const initialState = {
  myId: null,
  myName: '',
  isHost: false,
  isDrawing: false,
  roomId: null,
  settings: { maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2 },
  players: [],
  phase: 'lobby',
  currentRound: 0,
  totalRounds: 3,
  drawerId: null,
  drawerName: '',
  myWord: null,
  hintString: '',
  revealedWord: '',
  wordLength: 0,
  wordOptions: [],
  messages: [],
  timeLeft: 0,
  strokes: [],
  winner: null,
  error: '',
  notice: '',
}

function makeMessage(message) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    ...message,
  }
}

function markDrawing(players, drawerId) {
  return players.map((player) => ({
    ...player,
    isDrawing: player.id === drawerId,
    hasGuessedCorrectly: false,
  }))
}

export function GameProvider({ children }) {
  const [state, setState] = useState(initialState)
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const settingsRef = useRef(initialState.settings)

  const clearRoundTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRoundTimer = useCallback((drawTime) => {
    clearRoundTimer()
    setState((current) => ({ ...current, timeLeft: drawTime }))
    timerRef.current = setInterval(() => {
      setState((current) => {
        if (current.timeLeft <= 1) {
          clearRoundTimer()
          return { ...current, timeLeft: 0 }
        }

        return { ...current, timeLeft: current.timeLeft - 1 }
      })
    }, 1000)
  }, [clearRoundTimer])

  useEffect(() => {
    function syncIdentity(player, room) {
      const myId = socket.id
      const settings = room.settings || initialState.settings
      settingsRef.current = settings

      setState((current) => ({
        ...current,
        myId,
        myName: player.name,
        isHost: player.isHost,
        isDrawing: player.isDrawing,
        roomId: room.id,
        settings,
        players: room.players || [],
        phase: room.phase || 'lobby',
        currentRound: room.round || 0,
        totalRounds: room.totalRounds || settings.rounds,
        error: '',
      }))
    }

    socket.on('room_created', ({ player, room }) => {
      syncIdentity(player, room)
      navigate('/lobby')
    })

    socket.on('room_joined', ({ player, room }) => {
      syncIdentity(player, room)
      socket.emit('request_canvas')
      navigate('/lobby')
    })

    socket.on('player_joined', ({ players }) => {
      setState((current) => ({ ...current, players }))
    })

    socket.on('player_left', ({ players, newHostId }) => {
      setState((current) => ({
        ...current,
        players,
        isHost: newHostId === current.myId,
      }))
    })

    socket.on('game_state', ({ phase, round, totalRounds, players }) => {
      setState((current) => ({
        ...current,
        phase,
        currentRound: round,
        totalRounds,
        players,
        isDrawing: players.some((player) => player.id === current.myId && player.isDrawing),
      }))

      if (phase === 'drawing' || phase === 'picking' || phase === 'roundEnd') {
        navigate('/game')
      }
    })

    socket.on('round_start', ({ drawerId, drawerName, wordOptions, round, totalRounds }) => {
      setState((current) => {
        const isDrawing = current.myId === drawerId

        return {
          ...current,
          phase: isDrawing ? 'picking' : 'drawing',
          currentRound: round,
          totalRounds,
          drawerId,
          drawerName,
          isDrawing,
          myWord: null,
          hintString: '',
          revealedWord: '',
          wordLength: 0,
          wordOptions,
          messages: [],
          players: markDrawing(current.players, drawerId),
          strokes: [],
        }
      })
      startRoundTimer(settingsRef.current.drawTime)
      navigate('/game')
    })

    socket.on('your_word', ({ word }) => {
      setState((current) => ({
        ...current,
        phase: 'drawing',
        myWord: word,
        hintString: word,
      }))
    })

    socket.on('word_chosen', ({ hint, wordLength }) => {
      setState((current) => ({
        ...current,
        phase: 'drawing',
        hintString: hint,
        wordLength,
      }))
    })

    socket.on('hint_update', ({ hint }) => {
      setState((current) => ({ ...current, hintString: hint }))
    })

    socket.on('round_end', ({ word, scores }) => {
      clearRoundTimer()
      setState((current) => ({
        ...current,
        phase: 'roundEnd',
        revealedWord: word,
        players: scores,
        timeLeft: 0,
        myWord: null,
      }))
    })

    socket.on('game_over', ({ winner, leaderboard }) => {
      clearRoundTimer()
      setState((current) => ({
        ...current,
        phase: 'gameOver',
        winner,
        players: leaderboard,
      }))
      navigate('/gameover')
    })

    socket.on('guess_result', ({ correct, playerId, playerName, points, scores }) => {
      setState((current) => ({
        ...current,
        players: scores.map((player) => ({
          ...player,
          hasGuessedCorrectly: player.id === playerId ? correct : player.hasGuessedCorrectly,
        })),
        messages: [
          ...current.messages,
          makeMessage({
            playerId,
            playerName,
            text: `${playerName} guessed the word and earned ${points} points.`,
            type: 'system',
            correct,
          }),
        ],
      }))
    })

    socket.on('correct_word', ({ word }) => {
      setState((current) => ({
        ...current,
        hintString: word,
        notice: 'You got it!',
      }))
    })

    socket.on('close_guess', ({ message }) => {
      setState((current) => ({ ...current, notice: message || 'So close!' }))
    })

    socket.on('chat_message', (message) => {
      setState((current) => ({
        ...current,
        messages: [...current.messages, makeMessage(message)],
      }))
    })

    socket.on('canvas_replay', ({ strokes }) => {
      setState((current) => ({ ...current, strokes: strokes || [] }))
    })

    socket.on('error_message', ({ message }) => {
      setState((current) => ({ ...current, error: message }))
    })

    socket.on('error', ({ message } = {}) => {
      setState((current) => ({ ...current, error: message || 'Something went wrong' }))
    })

    return () => {
      clearRoundTimer()
      socket.removeAllListeners()
    }
  }, [clearRoundTimer, navigate, startRoundTimer])

  function ensureConnected() {
    if (!socket.connected) {
      socket.connect()
    }
  }

  const actions = useMemo(
    () => ({
      createRoom(playerName, settings) {
        ensureConnected()
        socket.emit('create_room', { playerName, settings })
      },
      joinRoom(roomId, playerName) {
        ensureConnected()
        socket.emit('join_room', { roomId: roomId.toUpperCase(), playerName })
      },
      startGame() {
        if (state.isHost && state.players.length >= 2) {
          socket.emit('start_game')
        }
      },
      chooseWord(word) {
        if (state.isDrawing && state.phase === 'picking') {
          socket.emit('word_chosen', { word })
        }
      },
      sendMessage(text) {
        const me = state.players.find((player) => player.id === state.myId)
        const hasGuessedCorrectly = Boolean(me && me.hasGuessedCorrectly)

        if (state.phase === 'drawing' && !state.isDrawing && !hasGuessedCorrectly) {
          socket.emit('guess', { text })
          return
        }

        socket.emit('chat', { text })
      },
      leaveRoom() {
        socket.emit('leave_room')
        socket.disconnect()
        setState(initialState)
        navigate('/')
      },
      clearError() {
        setState((current) => ({ ...current, error: '', notice: '' }))
      },
    }),
    [navigate, state],
  )

  const value = useMemo(() => ({ state, actions }), [state, actions])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
