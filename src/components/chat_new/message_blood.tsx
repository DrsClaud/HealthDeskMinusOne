import React, { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import * as d3 from "d3";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

// Function to generate the graph on a given SVG element
const generateGraph = (container, data) => {
    if (!container || !data) return;
    
    // Clear any existing SVG
    d3.select(container).selectAll("*").remove();

    // Set dimensions
    const margin = { top: 10, right: 5, bottom: 20, left: 30 };
    const width = 300 - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;

    // Convert data object to array format for D3
    const graphData = Object.entries(data).map(([key, value]) => ({ 
        key, 
        value: typeof value === 'number' ? value : Number(value) || 0 
    }));

    let color_1 = "rgb(43, 43, 43)";
    let color_2 = "rgb(255, 255, 255)";

    // Create SVG
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create X scale
    const x = d3.scaleBand()
        .domain(graphData.map(d => d.key))
        .range([0, width])
        .padding(0.1);

    // Create Y scale (values from 0 to 2)
    const y = d3.scaleLinear()
        .domain([0, 2])
        .range([height, 0]);

    // Add horizontal reference line at y=1
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(1))
        .attr("y2", y(1))
        .attr("stroke", color_1)
        .attr("stroke-width", 2.5);
        
    // Add horizontal reference line at y=0.5
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(0.5))
        .attr("y2", y(0.5))
        .attr("stroke", color_1)
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 1);
        
    // Add horizontal reference line at y=1.5
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(1.5))
        .attr("y2", y(1.5))
        .attr("stroke", color_1)
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 1);
        
    // Add horizontal reference line at y=2
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(2))
        .attr("y2", y(2))
        .attr("stroke", color_1)
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 1);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .style("fill", color_1);

    // Add Y axis with specific tick values
    svg.append("g")
        .call(d3.axisLeft(y).tickValues([0, 0.5, 1.0, 1.5, 2.0]))
        .selectAll("text")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .style("fill", color_1);

    // Make both axes thicker
    svg.selectAll(".domain, .tick line")
        .attr("stroke-width", 2.5)
        .attr("stroke", color_1);

    // Create the line
    const line = d3.line<{ key: string; value: number }>()
        .x(d => x(d.key)! + x.bandwidth()! / 2)
        .y(d => y(d.value));

    // Add the dotted line path
    svg.append("path")
        .datum(graphData)
        .attr("fill", "none")
        .attr("stroke", color_2)
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "5,3")
        .attr("d", line);

    // Add dots at each data point
    svg.selectAll(".dot")
        .data(graphData)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.key)! + x.bandwidth()! / 2)
        .attr("cy", d => y(d.value as number))
        .attr("r", 3)
        .attr("fill", color_2);
};

export default function MessageBlood({ message, direction }) {
    const graphRef = useRef(null);
    
    // Parse the message as JSON if it's a string, otherwise use it directly
    const graphData = React.useMemo(() => {
        if (typeof message === 'string') {
            try {
                return JSON.parse(message);
            } catch (e) {
                // If message is not valid JSON, use a default object
                return {
                    "EOS": 0.5,
                    "NEU": 1.0,
                    "LYM": 1.2,
                    "MON": 0.8,
                    "PLT": 0.75,
                    "RBC": 1,
                    "WBC": 1
                };
            }
        }
        return message;
    }, [message]);
    
    // Generate the graph when the component mounts or when data changes
    useEffect(() => {
        if (graphRef.current) {
            generateGraph(graphRef.current, graphData);
        }
    }, [graphData]);

    return (
        <Box
            sx={{
                backgroundColor: '#63a2ff',
                borderRadius: '8px',
                padding: '10px',
                margin: '5px 0',
                width: 'fit-content',
                alignSelf: direction === 'outgoing' ? 'flex-end' : 'flex-start',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                boxShadow: 1,
                // minHeight: '100px',
            }}
        >
            <Box sx={{ minWidth: '50px', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor" className="icon icon-tabler icons-tabler-filled icon-tabler-droplet"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10.708 2.372a2.382 2.382 0 0 0 -.71 .686l-4.892 7.26c-1.981 3.314 -1.22 7.466 1.767 9.882c2.969 2.402 7.286 2.402 10.254 0c2.987 -2.416 3.748 -6.569 1.795 -9.836l-4.919 -7.306c-.722 -1.075 -2.192 -1.376 -3.295 -.686z" /></svg>
                <Typography variant="caption" sx={{ fontWeight: 'bold',  }}>AB+</Typography>
            </Box>

            <Box sx={{
                borderLeft: '2.5px solid black',
                alignSelf: 'stretch',
                marginLeft: '10px',
                marginRight: '10px'
            }} />

            {/* <Box sx={{ flexGrow: 1 }}> */}
                {/* <div ref={graphRef} style={{ width: '100%', height: '250px' }} /> */}
                <div ref={graphRef} style={{  }} />
            {/* </Box> */}
        </Box>
    );
}





