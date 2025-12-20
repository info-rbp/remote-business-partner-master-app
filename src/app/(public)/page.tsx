
export default function HomePage() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to DealFlow AI</h1>
      <p className="text-lg mb-8">
        Your intelligent partner in crafting winning business proposals.
      </p>
      <p className="mb-4">
        Navigate to the dashboard to get started.
      </p>
      <a href="/dashboard" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Go to Dashboard
      </a>
    </div>
  );
}
