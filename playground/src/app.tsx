import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <span>{count}</span>
            <button onClick={() => setCount(count + 1)}>+1</button>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
