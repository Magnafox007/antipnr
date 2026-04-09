import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useState } from 'react';
import RouteUploadScreen from '../../components/RouteUploadScreen';
import RouteAnalysisResultScreen from '../../components/RouteAnalysisResultScreen';
import { RouteAnalysisResult } from '../../services/routeAnalyzerService';

export default function RouteScreen() {
  const [results, setResults] = useState<RouteAnalysisResult | null>(null);

  const handleAnalysisComplete = (analysisResult: RouteAnalysisResult) => {
    setResults(analysisResult);
  };

  const handleBack = () => {
    setResults(null);
  };

  const handleViewAddress = (addressId: string) => {
    console.log('View address:', addressId);
  };

  return (
    <SafeAreaView style={styles.container}>
      {!results ? (
        <RouteUploadScreen onAnalysisComplete={handleAnalysisComplete} />
      ) : (
        <RouteAnalysisResultScreen
          result={results}
          onBack={handleBack}
          onViewAddress={handleViewAddress}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
