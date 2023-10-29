import React from 'react'; // Import React library
import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import { BlockMath } from 'react-katex'; // Import BlockMath from react-katex

function YourComponent() { // Define your component
  return (
    <h3>
      <BlockMath math="3 \times 4 \div (5 - 3)" /> {/* Use BlockMath for display mode */}
    </h3>
  );
}

export default YourComponent; // Export your component