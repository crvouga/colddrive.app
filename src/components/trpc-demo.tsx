import { trpc } from '@/lib/trpc-client';

export function TrpcDemo() {
  // Prefer using React Query hooks provided by tRPC for auto state management
  const helloQuery = trpc.greeting.hello.useQuery({ name: 'tRPC User' });
  const allQuery = trpc.greeting.getAll.useQuery();

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-6">
      <h2 className="text-2xl font-bold">tRPC Demo</h2>

      {(helloQuery.isLoading || allQuery.isLoading) && <p>Loading...</p>}
      {(helloQuery.error || allQuery.error) && (
        <p className="text-red-500">
          Error: {helloQuery.error?.message || allQuery.error?.message}
        </p>
      )}

      {helloQuery.data && (
        <div>
          <h3 className="font-semibold">Hello Query Result:</h3>
          <p>{helloQuery.data.message}</p>
        </div>
      )}

      {allQuery.data && allQuery.data.length > 0 && (
        <div>
          <h3 className="font-semibold">Get All Query Result:</h3>
          <ul className="list-disc list-inside">
            {allQuery.data.map((item: any) => (
              <li key={item.id}>{item.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
