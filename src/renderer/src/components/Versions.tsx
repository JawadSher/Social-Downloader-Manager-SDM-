import { useEffect, useState } from 'react'

function Versions(): React.JSX.Element {
  const [appVersion, setAppVersion] = useState('Loading…')

  useEffect(() => {
    let isMounted = true
    void window.sdm.app
      .getVersion()
      .then((version) => {
        if (isMounted) setAppVersion(version)
      })
      .catch(() => {
        if (isMounted) setAppVersion('Unavailable')
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <ul className="versions">
      <li className="app-version" role="status">
        SDM v{appVersion}
      </li>
    </ul>
  )
}

export default Versions
