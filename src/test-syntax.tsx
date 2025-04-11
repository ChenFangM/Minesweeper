// This is a test file to verify the syntax
import React from 'react';

const TestComponent = () => {
  // Test the syntax for a useEffect with dependency array
  React.useEffect(() => {
    // Some code
  }, [dep1, dep2, dep3]);
  
  // Test the syntax for a component return
  return (
    <div>
      Test component
    </div>
  );
};

export default TestComponent;
