export default function Home() {
  return (
    <div className="space-y-6">
      <section className="text-center py-10">
        <h1 className="text-3xl font-bold">Context-Aware Polls & Surveys</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Organize feedback under Projects and Products.</p>
        <div className="flex gap-3 justify-center mt-6">
          <a href="/projects" className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black">Explore Projects</a>
          <a href="/polls" className="px-4 py-2 rounded border">Explore Polls</a>
          <a href="/surveys" className="px-4 py-2 rounded border">Explore Surveys</a>
        </div>
      </section>
    </div>
  )
}
