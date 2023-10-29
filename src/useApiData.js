import { useState, useEffect } from 'react';

const useApiData = (url) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const jsonData = await response.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        setError(err);
      }
    };

    fetchData();
  }, [url]);

  return {
    userLatexSolution: data?.userLatexSolution || '',
    wolframSolution: data?.wolframSolution || '',
    chatGPTComparison: data?.chatGPTComparison || '',
    errorType: data?.errorType || '',
    error: error,
    isLoading: data === null && error === null,
  };
};

export default useApiData;