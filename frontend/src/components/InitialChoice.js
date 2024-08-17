import React from 'react';

const InitialChoice = ({ onChoiceSelected }) => {
  return (
    <div>
      <h2>Welcome to BikeBusters</h2>
      <button onClick={() => onChoiceSelected('report')}>Report a Stolen Bike</button>
      <button onClick={() => onChoiceSelected('login')}>Login / Register</button>
    </div>
  );
};

export default InitialChoice;