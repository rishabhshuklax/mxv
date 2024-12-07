import React from 'react';
import axios from "axios";
import EntityCard from "../components/EntityCard";
import { useState } from "react";
import Input from '@mui/joy/Input';
import { Button } from '@mui/joy';


const EntitySearch = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [entityList, setEntityList] = useState([]);

    const [searchType, setSearchType] = useState("movie");

    const handleSearchTermChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleSearchTypeChange = (event) => {
        setSearchType(event.target.value);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        axios.get(`http://localhost:3001/api/entity/search?query=${searchTerm}`)
            .then((response) => {
                console.log(response.data, searchTerm);
                if (response.data.length === 0) {
                    alert("No results found");
                }
                setEntityList(response.data);
            })
            .catch((error) => {
                console.log(error);
            });
    };

    return (
        <div className='search-page'>
            <div className='search-box'>
                <Input placeholder="Search for movies or tv shows" onChange={handleSearchTermChange} />
                <Button  variant="contained" color="primary" onClick={handleSearch}>Search</Button>
            </div>
            <div className='entity-recommendation-list'>
                {entityList.map((entity) => (
                    <EntityCard key={entity.id} movie={entity} />
                ))}
            </div>
        </div>
    );
};

export default EntitySearch;