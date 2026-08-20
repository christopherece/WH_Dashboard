export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-navy-700"></div>
        <p className="mt-4 text-gray-600">Loading occupancy data...</p>
      </div>
    </div>
  );
}