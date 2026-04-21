import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';

const HelpIcon = ({ radius = 20, text = "Help text" }) => {
    const [showText, setShowText] = useState(false);
    const theme = useTheme();

    const iconStyle = {
        width: `${radius}px`,
        height: `${radius}px`,
        backgroundColor: theme.palette.primary.main,
        borderRadius: '50%',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        // We disable selection:
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        KhtmlUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
    };

    const textStyle = {
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        padding: '8px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        marginTop: '8px',
        display: showText ? 'block' : 'none',
        fontFamily: 'Arial, sans-serif',
        color: 'black',
        fontSize: '18px',
        width: '200px',
        wordWrap: 'break-word',
    };

    return (
        <div
            style={iconStyle}
            onClick={() => setShowText(!showText)}
        >
            ?
            <div
                style={textStyle}
                dangerouslySetInnerHTML={{ __html: text }}
            />
        </div>
    );
};

export default HelpIcon;
