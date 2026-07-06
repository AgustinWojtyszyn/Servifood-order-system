import LoadingState from '../ui/LoadingState'
import SkeletonBlock from '../ui/SkeletonBlock'

const DailyLoader = () => (
  <div className="mx-auto max-w-screen-2xl rounded-3xl bg-slate-50/70 p-4 md:p-6 2xl:p-10">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <LoadingState
        variant="inline"
        message="Cargando pedidos..."
        tone="slate"
      />
    </div>
    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
    </div>
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
      <SkeletonBlock className="h-10 w-full max-w-xl" />
      <div className="mt-4 space-y-3">
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-12" />
      </div>
    </div>
  </div>
)

export default DailyLoader
