import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faShapes } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Link } from 'react-router-dom';

const Header = (props) => {
  return (
    <nav className="header-container">
      <div className="container mx-10 px-4 py-10 flex justify-between items-center">
        <Link to="/">
            <div className="header-misc-icon text-2xl font-bold">
                <FontAwesomeIcon icon={faShapes} color='white' />
            </div>
        </Link>
      </div>
      <div className="header-title container mx-auto px-4 py-10 flex justify-between items-center">
        <p className="header-title-para font-extrabold tracking-wide font-mono">
            {props.title}
        </p>
      </div>
      <div className='container mx-10 px-4 py-10 header-search'>
        <div className='header-misc-icon header-misc-icon-search'>
            <FontAwesomeIcon icon={faSearch} color='white' />
        </div>
      </div>
    </nav>
  );
};

export default Header;
