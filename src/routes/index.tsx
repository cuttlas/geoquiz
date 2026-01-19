import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <img src="/icon.png" alt="GeoQuiz" className="w-24 h-24 mb-6" />
      <h1 className="text-4xl font-bold text-gray-900 mb-4">GeoQuiz</h1>
      <p className="text-gray-600 mb-8">Test your geography knowledge</p>
      {/* Quiz generator UI will go here */}
      <div className="text-gray-500">Quiz generator coming soon...</div>
    </div>
  );
}
