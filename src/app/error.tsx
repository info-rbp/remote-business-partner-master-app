
'use client'; // Error components must be Client components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col justify-center items-center h-screen">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className='text-red-500 mb-4'>{error.message}</p>
        <button
            onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
            }
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
            Try again
        </button>
    </div>
  );
}
