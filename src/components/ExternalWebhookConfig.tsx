'use client';

import React, { useState, useEffect } from 'react';

interface WebhookConfig {
  webhookUrls: string[];
  totalConfigured: number;
  maxAllowed: number;
}

export default function ExternalWebhookConfig() {
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhookConfig();
  }, []);

  const fetchWebhookConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhook-config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
      } else {
        setError(data.error || 'Failed to fetch webhook configuration');
      }
    } catch {
      setError('Failed to fetch webhook configuration');
    } finally {
      setLoading(false);
    }
  };

  const displayUrl = (url: string): string => {
    // Return the full URL without masking
    return url;
  };

  const getServiceName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('discord.com')) {
        return 'Discord';
      } else if (urlObj.hostname.includes('slack.com')) {
        return 'Slack';
      } else if (urlObj.hostname.includes('telegram.org')) {
        return 'Telegram';
      } else {
        return 'Custom API';
      }
    } catch {
      return 'Custom API';
    }
  };

  const getServiceIcon = (url: string): React.ReactElement => {
    const serviceName = getServiceName(url);
    
    switch (serviceName) {
      case 'Discord':
        return (
          <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        );
      case 'Slack':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 5.042 10.12h2.52v2.522a2.528 2.528 0 0 1-2.52 2.523zm0-6.335A2.528 2.528 0 0 1 2.522 6.307 2.528 2.528 0 0 1 5.042 3.784h2.52v2.523A2.528 2.528 0 0 1 5.042 8.83zm6.335 0a2.528 2.528 0 0 1 2.523-2.523A2.528 2.528 0 0 1 15.92 8.83h-2.522V6.307A2.528 2.528 0 0 1 11.377 8.83zm0 6.335a2.528 2.528 0 0 1 2.523 2.523A2.528 2.528 0 0 1 11.377 20.21h-2.522v-2.522a2.528 2.528 0 0 1 2.522-2.523zm6.335 0a2.528 2.528 0 0 1-2.523-2.523 2.528 2.528 0 0 1 2.523-2.522h2.522v2.522a2.528 2.528 0 0 1-2.522 2.523zm0-6.335a2.528 2.528 0 0 1-2.523-2.523A2.528 2.528 0 0 1 17.712 3.784h2.522v2.523a2.528 2.528 0 0 1-2.522 2.523z"/>
          </svg>
        );
      case 'Telegram':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">External Webhook Configuration</h3>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">External Webhook Configuration</h3>
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {config?.totalConfigured || 0} of {config?.maxAllowed || 10} configured
        </span>
      </div>

      {config?.webhookUrls.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-lg font-medium mb-2">No External Webhooks Configured</p>
          <p className="text-sm">
            Add webhook URLs to your environment variables to forward TradingView alerts to external applications.
          </p>
          <div className="mt-4 text-xs text-gray-400">
            <p>Example: EXTERNAL_WEBHOOK_URL_1=https://discord.com/api/webhooks/...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {config?.webhookUrls.map((url, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                {getServiceIcon(url)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {getServiceName(url)}
                  </span>
                  <span className="text-xs text-gray-500">
                    #{index + 1}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-mono break-all">
                  {displayUrl(url)}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Note:</strong> TradingView alerts are automatically forwarded to all configured webhook URLs before order processing. 
          The original JSON payload from TradingView is sent to each webhook.
        </p>
      </div>
    </div>
  );
}
