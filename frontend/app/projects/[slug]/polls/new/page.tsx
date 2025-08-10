export default function NewPollPage({ params }: { params: { slug: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Create Poll</h1>
          <p className="text-muted-foreground">Project: {params.slug}</p>
        </div>
      </div>
      
      <div className="max-w-2xl">
        <p className="text-muted-foreground">Poll creation form will be implemented here.</p>
      </div>
    </div>
  )
}