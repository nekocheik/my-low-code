import React from 'react';

const SomeComponent: React.FC = () => {
  const someObject = { key: 'value' };
  return (
    <div>
      {someObject.key} {/* Affiche 'value' */}
      {/* Ou utilisez JSON.stringify si nécessaire */}
      <pre>{JSON.stringify(someObject, null, 2)}</pre>
    </div>
  );
};

export default SomeComponent;
