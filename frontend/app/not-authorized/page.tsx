'use client';

import { useRouter } from 'next/navigation';

export default function NotAuthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300 mb-4">403</h1>
        <p className="text-gray-600 text-lg mb-2">Not Authorized</p>
        <p className="text-gray-400 text-sm mb-6">
          You do not have permission to view this page.
        </p>
        <button
          onClick={() => router.back()}
          className="text-indigo-600 text-sm hover:underline"
        >
          Go back
        </button>
      </div>
    </div>
  );
}