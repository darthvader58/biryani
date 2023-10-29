import React from 'react';
import useApiData from './useApiData'; // Import the custom hook

function MyComponent() {
  const apiUrl = 'https://example.com/api/data'; // Replace with your API URL
  const { userLatexSolution, wolframSolution, chatGPTComparison, errorType, error, isLoading } = useApiData(apiUrl);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  // Now you can use the data in your component as needed
  return (
    <div>
      <p>User LaTeX Solution: {userLatexSolution}</p>
      <p>Wolfram Solution: {wolframSolution}</p>
      <p>ChatGPT Comparison: {chatGPTComparison}</p>
      <p>Error Type: {errorType}</p>
    </div>
  );
}

export default MyComponent;
