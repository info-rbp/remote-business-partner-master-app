
import Link from 'next/link';
import ProposalStatusChart from '../components/proposal-status-chart';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Proposals</h2>
          <p className="text-gray-400 mb-4">Manage your proposals</p>
          <div className="flex justify-between">
            <Link href="/proposals" className="text-blue-500 hover:underline">
              View Proposals
            </Link>
            <Link href="/proposals/new" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Create New
            </Link>
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Clients</h2>
          <p className="text-gray-400 mb-4">Manage your clients</p>
          <Link href="/clients" className="text-blue-500 hover:underline">
            View Clients
          </Link>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Settings</h2>
          <p className="text-gray-400 mb-4">Configure your settings</p>
          <Link href="/settings" className="text-blue-500 hover:underline">
            View Settings
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <ProposalStatusChart />
      </div>
    </div>
  );
}
