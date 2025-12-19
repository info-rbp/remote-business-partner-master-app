
'use client';

import { useState, FormEvent, useRef } from 'react';
import { DocumentVault } from '../components/document-vault';

interface Client {
  id: number;
  name: string;
  contact: string;
  email: string;
}

interface ClientModalProps {
  client: Client | null;
  onSave: (client: Omit<Client, 'id'> & { id: number | null }) => void;
  onClose: () => void;
}

const initialClients: Client[] = [
  { id: 1, name: 'Acme Inc.', contact: 'John Doe', email: 'john.doe@acme.com' },
  {
    id: 2,
    name: 'Stark Industries',
    contact: 'Tony Stark',
    email: 'tony.stark@starkindustries.com',
  },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClients[0]?.id.toString() ?? '',
  );
  const orgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? 'demo-org';
  const nextClientId = useRef(
    Math.max(0, ...initialClients.map((client) => client.id)) + 1,
  );

  const openModal = (client: Client | null = null) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedClient(null);
    setIsModalOpen(false);
  };

  const handleSave = (client: Omit<Client, 'id'> & { id: number | null }) => {
    if (client.id) {
      const updated = clients.map((c) => (c.id === client.id ? (client as Client) : c));
      setClients(updated);
      ensureSelectedClient(updated);
    } else {
      const newId = nextClientId.current++;
      const nextClient = { ...client, id: newId };
      const updated = [...clients, nextClient];
      setClients(updated);
      setSelectedClientId(nextClient.id.toString());
    }
    closeModal();
  };

  const handleDelete = (client: Client) => {
    const updated = clients.filter((c) => c.id !== client.id);
    setClients(updated);
    ensureSelectedClient(updated);
  };

  const ensureSelectedClient = (nextClients: Client[]) => {
    if (!nextClients.find((client) => client.id.toString() === selectedClientId)) {
      setSelectedClientId(nextClients[0]?.id.toString() ?? '');
    }
  };

  const handleSelectForVault = (client: Client) => {
    setSelectedClientId(client.id.toString());
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Clients</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Client
        </button>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Contact</th>
              <th className="p-2">Email</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-gray-700">
                <td className="p-2">{client.name}</td>
                <td className="p-2">{client.contact}</td>
                <td className="p-2">{client.email}</td>
                <td className="p-2">
                  <button
                    onClick={() => openModal(client)}
                    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mr-2"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleSelectForVault(client)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                  >
                    Open Vault
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedClientId ? (
        <DocumentVault
          orgId={orgId}
          entityType="client"
          entityId={selectedClientId}
          clientId={selectedClientId}
          title="Client Document Vault"
          allowUploads
          defaultVisibility="internal"
          defaultCategory="contracts"
        />
      ) : (
        <div className="mt-6 text-gray-400">Select a client to manage their vault.</div>
      )}
      {isModalOpen && (
        <ClientModal
          client={selectedClient}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function ClientModal({ client, onSave, onClose }: ClientModalProps) {
  const [name, setName] = useState(client ? client.name : '');
  const [contact, setContact] = useState(client ? client.contact : '');
  const [email, setEmail] = useState(client ? client.email : '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ id: client ? client.id : null, name, contact, email });
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-1/3">
          <h2 className="text-2xl font-bold mb-4">
            {client ? 'Edit Client' : 'Add Client'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Contact</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
