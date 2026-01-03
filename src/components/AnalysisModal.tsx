import { AlertCircle, BarChart, Calendar, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react';
import React from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/badge';

interface AnalysisResult {
  ticker: string;
  company: string;
  asset_type: string;
  timestamp: string;
  sentiment_score: number | null;
  sentiment_analysis: string | null;
  news_items: string | null;
  decision_score: string;
  positive_reasons: string[];
  negative_reasons: string[];
}

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  isLoading,
  error,
}) => {
  if (!isOpen) return null;

  const getScoreColor = (score: string) => {
    const numScore = parseInt(score);
    if (numScore >= 7) return 'text-green-600 bg-green-50';
    if (numScore >= 4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBadge = (score: string) => {
    const numScore = parseInt(score);
    if (numScore >= 7) return <Badge className="bg-green-600">Strong Buy</Badge>;
    if (numScore >= 5) return <Badge className="bg-blue-600">Buy</Badge>;
    if (numScore === 5) return <Badge className="bg-gray-600">Hold</Badge>;
    if (numScore >= 3) return <Badge className="bg-orange-600">Sell</Badge>;
    return <Badge className="bg-red-600">Strong Sell</Badge>;
  };

  const getSentimentEmoji = (score: number | null) => {
    if (score === null) return '➡️';
    if (score >= 8) return '🚀';
    if (score >= 4) return '📈';
    if (score >= -3) return '➡️';
    if (score >= -7) return '📉';
    return '⚠️';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                AI Investment Analysis
              </h2>
              {analysis && (
                <p className="text-sm text-gray-500 mt-1">
                  {analysis.company} ({analysis.ticker.toUpperCase()}) • {analysis.asset_type === 'crypto' ? 'Cryptocurrency' : 'Stock'}
                </p>
              )}
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600">Analyzing market data and news sentiment...</p>
                <p className="text-sm text-gray-500">This may take up to 2 minutes</p>
              </div>
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900">Analysis Error</h3>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {analysis && !isLoading && (
            <>
              {/* Decision Score */}
              <Card className={`border-2 ${getScoreColor(analysis.decision_score)}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      Investment Decision Score
                    </CardTitle>
                    {getScoreBadge(analysis.decision_score)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`text-5xl font-bold ${getScoreColor(analysis.decision_score)}`}>
                      {analysis.decision_score}/10
                    </div>
                    <div className="flex-1 text-sm text-gray-600">
                      {parseInt(analysis.decision_score) >= 7 && 'Strong bullish indicators suggest this is a good buying opportunity.'}
                      {parseInt(analysis.decision_score) >= 5 && parseInt(analysis.decision_score) < 7 && 'Moderate bullish indicators suggest potential upside.'}
                      {parseInt(analysis.decision_score) === 5 && 'Neutral indicators suggest a hold position.'}
                      {parseInt(analysis.decision_score) >= 3 && parseInt(analysis.decision_score) < 5 && 'Moderate bearish indicators suggest caution.'}
                      {parseInt(analysis.decision_score) < 3 && 'Strong bearish indicators suggest avoiding or selling.'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sentiment Analysis */}
              {analysis.sentiment_score !== null && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      News Sentiment Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getSentimentEmoji(analysis.sentiment_score)}</span>
                      <div>
                        <div className="font-semibold">
                          Score: {analysis.sentiment_score}/10
                        </div>
                        <div className="text-sm text-gray-600">
                          Based on recent news and market sentiment
                        </div>
                      </div>
                    </div>

                    {analysis.sentiment_analysis && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                          {analysis.sentiment_analysis}
                        </pre>
                      </div>
                    )}

                    {analysis.news_items && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                          View News Articles Analyzed
                        </summary>
                        <div className="mt-2 bg-gray-50 rounded-lg p-4">
                          <pre className="whitespace-pre-wrap text-xs text-gray-600">
                            {analysis.news_items}
                          </pre>
                        </div>
                      </details>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Positive Reasons */}
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-5 w-5" />
                    Bullish Factors ({analysis.positive_reasons.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.positive_reasons.filter(r => r.trim()).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 font-bold mt-0.5">+</span>
                        <span className="text-gray-700">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Negative Reasons */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <TrendingDown className="h-5 w-5" />
                    Bearish Factors ({analysis.negative_reasons.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.negative_reasons.filter(r => r.trim()).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-red-600 font-bold mt-0.5">−</span>
                        <span className="text-gray-700">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Footer Info */}
              <div className="text-xs text-gray-500 text-center">
                Analysis completed: {formatTimestamp(analysis.timestamp)}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
