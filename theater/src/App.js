import React, { useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import HomePage from "./pages/Home";
import Play from "./pages/Play";
import Header from "./components/Header";


export const Layout = ({ children }) => {
  const [title, setTitle] = useState("Theater");

  const childrenWithProps = React.Children.map(children, (child) =>
    React.cloneElement(child, { setTitle })
  );
  
  return (
    <div className="main-container antialiased">
      <Header title={title} />
      {childrenWithProps}
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout><HomePage /></Layout>,
  },
  {
    path: "/play/:id",
    element: <Layout><Play /></Layout>,
  }
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
