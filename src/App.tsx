import { useState } from 'react'
import JsonWorkbench from '../JsonUtilties/JsonWorkbench'
import DecryptUtilities from '../Decrypt-utilities/DecryptUtilities'

type Utility = 'json' | 'decrypt'

function App() {
  const [utility, setUtility] = useState<Utility>('json')

  return utility === 'json'
    ? <JsonWorkbench onOpenDecrypt={() => setUtility('decrypt')} />
    : <DecryptUtilities onBack={() => setUtility('json')} />
}

export default App
