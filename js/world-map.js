const WORLD_MAP = {
    "rooms": [
        {
            "id": "MainHub",
            "position": "0 0 0",
            "walls": [
                {"pos": "0 2.5 -10", "rot": "0 0 0", "w": 20, "h": 5, "tex": "#brick-wall"}, 
                {"pos": "0 2.5 10", "rot": "0 180 0", "w": 20, "h": 5, "tex": "#brick-wall"}, 
                {"pos": "-10 2.5 0", "rot": "0 90 0", "w": 20, "h": 5, "tex": "#brick-wall"}, 
                {"pos": "10 2.5 0", "rot": "0 -90 0", "w": 20, "h": 5, "tex": "#brick-wall"}, 
                {"pos": "0 5 0", "rot": "90 0 0", "w": 20, "h": 20, "tex": "#brick-wall"} 
            ],
            "floor": {"size": "20 20", "tex": "#checker-floor"}
        },
        {
            "id": "ScorpionRoom",
            "position": "100 0 100", 
            "walls": [
                {"pos": "0 2.5 -10", "rot": "0 0 0", "w": 20, "h": 5, "tex": "#brick-wall"},
                {"pos": "10 2.5 0", "rot": "0 -90 0", "w": 20, "h": 5, "tex": "#brick-wall"},
                {"pos": "0 5 0", "rot": "90 0 0", "w": 20, "h": 20, "tex": "#brick-wall"}
            ],
            "floor": {"size": "20 20", "tex": "#checker-floor"}
        }
    ]
};
