import { useState } from 'react'
import JsonWorkbench from '../JsonUtilities/JsonWorkbench'
import DecryptUtilities from '../Decrypt-utilities/DecryptUtilities'
import DateTimeUtilities from '../DateTimeUtilities/DateTimeUtilities'

type Utility = 'json' | 'decrypt' | 'datetime'

function App() {
  const [utility, setUtility] = useState<Utility>('json')

  if (utility === 'decrypt') return <DecryptUtilities onBack={() => setUtility('json')} />
  if (utility === 'datetime') return <DateTimeUtilities onBack={() => setUtility('json')} />
  return <JsonWorkbench onOpenDecrypt={() => setUtility('decrypt')} onOpenDateTime={() => setUtility('datetime')} />
}

export default App
