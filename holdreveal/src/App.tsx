import { lazy, Suspense, useCallback, useState } from 'react'
import Landing from './screens/Landing'
import type { Project, Screen } from './state'

const ChooseScreen = lazy(() => import('./screens/ChooseScreen'))
const EditGhost = lazy(() => import('./screens/EditGhost'))
const EditSwap = lazy(() => import('./screens/EditSwap'))
const PreviewScreen = lazy(() => import('./screens/PreviewScreen'))
const ExportScreen = lazy(() => import('./screens/ExportScreen'))

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <div className="checker h-10 w-10 animate-pulse rounded-lg" aria-label="Loading" />
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [project, setProject] = useState<Project | null>(null)

  const go = useCallback((s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-dvh bg-ink text-fg">
      {screen === 'landing' && <Landing onStart={() => go('choose')} />}
      <Suspense fallback={<Loading />}>
        {screen === 'choose' && (
          <ChooseScreen
            onBack={() => go('landing')}
            onReady={(p) => {
              setProject(p)
              go('edit')
            }}
          />
        )}
        {screen === 'edit' && project?.mode === 'ghost' && project.ghost && (
          <EditGhost
            project={project}
            onBack={() => go('choose')}
            onDone={(p) => {
              setProject(p)
              go('preview')
            }}
          />
        )}
        {screen === 'edit' && project?.mode === 'swap' && project.swap && (
          <EditSwap
            project={project}
            onBack={() => go('choose')}
            onDone={(p) => {
              setProject(p)
              go('preview')
            }}
          />
        )}
        {screen === 'preview' && project?.encoded && (
          <PreviewScreen
            project={project}
            onBack={() => go('edit')}
            onNext={() => go('export')}
          />
        )}
        {screen === 'export' && project?.encoded && (
          <ExportScreen
            project={project}
            onBack={() => go('preview')}
            onRestart={() => {
              setProject(null)
              go('landing')
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
