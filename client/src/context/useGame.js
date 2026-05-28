import { useContext } from 'react'
import { GameContext } from './GameContextObject.js'

export function useGame() {
  return useContext(GameContext)
}
