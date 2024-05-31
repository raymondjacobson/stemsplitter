export const Animation = () => {
  return (
    <div>
      <style>{`
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: #FCFCFC;
          font-family: Arial, sans-serif;
          color: white;
        }

        .container {
          position: relative;
          width: 300px;
          height: 300px;
        }

        .disc {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 150px;
          height: 150px;
          background: linear-gradient(#D63FE6, #9849D6);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: spin 10s linear infinite;
          box-shadow: 0 0 20px #D63FE6, 0 0 80px #9849D6;
        }

        .inner {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 10px;
          height: 10px;
          background: rgba(0,0,0,0.17);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 20px black, 0 0 80px black;
        }

        .bar {
          position: absolute;
          bottom: 20px;
          width: 10px;
          background: linear-gradient(45deg, #D63FE6, #A30CB3);
          border-radius: 5px;
          box-shadow: 0 0 20px #D63FE6, 0 0 80px #A30CB3;
          animation: bounce 2s infinite ease-in-out;
        }

        .bar:nth-child(1) { left: 20%; height: 40px; animation-delay: 0s; }
        .bar:nth-child(2) { left: 30%; height: 60px; animation-delay: 0.1s; }
        .bar:nth-child(3) { left: 40%; height: 45px; animation-delay: 0.2s; }
        .bar:nth-child(4) { left: 50%; height: 35px; animation-delay: 0.3s; }
        .bar:nth-child(5) { left: 60%; height: 100px; animation-delay: 0.4s; }
        .bar:nth-child(6) { left: 70%; height: 50px; animation-delay: 0.5s; }

        .wave {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 200px;
          border: 5px solid rgba(242, 242, 242, 0.5);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: ripple 3s infinite ease-in-out;
        }

        .wave { animation-delay: 0s; }

        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-50px); }
        }

        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      `}</style>
      <div className="container">
        <div className="disc">
          <div className="inner"></div>
        </div>
        <div className="wave"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>
    </div>
  );
}
