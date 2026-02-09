import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

const Dapps: React.FC = () => {
  const dapps = [
    {
      title: 'Premium Subscription',
      description: 'Unlock premium features with a blockchain-based subscription payment system.',
      path: '/premium',
      icon: '⭐',
      features: ['Premium Features', 'Blockchain Payment', 'Subscription Management']
    },
    {
      title: 'Secret Remarks',
      description: 'Store and retrieve secrets on the Polkadot Network.',
      path: 'https://secret-remarks.netlify.app/',
      icon: '🔒',
      features: ['Store Secrets', 'Retrieve Secrets', 'Agentic Password Manager'],
      isExternal: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Decentralized Applications
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Explore blockchain-powered applications built on Polkadot networks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dapps.map((dapp) => (
            <Card key={dapp.path} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{dapp.icon}</span>
                  <div>
                    <CardTitle className="text-xl">{dapp.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {dapp.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Features:
                    </h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {dapp.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {dapp.isExternal ? (
                    <a href={dapp.path} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full">
                        Launch {dapp.title}
                      </Button>
                    </a>
                  ) : (
                    <Link to={dapp.path}>
                      <Button className="w-full">
                        Launch {dapp.title}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              About Our dApps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Premium Subscription
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  A subscription service built on Polkadot's Paseo testnet, showcasing blockchain-based payments (using smol402) and access control for premium features.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Secret Remarks
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  A dApp for securely storing and retrieving secrets on the Polkadot Network.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dapps;
