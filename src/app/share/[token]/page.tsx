
export default function SharePage({ params }: { params: { token: string } }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 p-4 sm:p-6">
        <div className="border rounded-lg shadow-sm p-6 bg-white">
          <h1 className="text-2xl font-bold mb-4">Proposal {params.token}</h1>
          <p className="text-gray-700">This is the content for proposal {params.token}.</p>
        </div>
      </main>
    </div>
  );
}
