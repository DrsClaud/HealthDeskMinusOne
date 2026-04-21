import React from 'react';
import { Box } from '@mui/material';
import ForceGraph2D from 'react-force-graph-2d';

// Define the structure for nodes and links
interface NodeObject {
    id: string;
    name: string;
    val: number; // Add value for sizing
}

interface LinkObject {
    source: string;
    target: string;
}

// Define the props for the component (none currently; extend when needed)
type NewDiseasesBoxProps = Record<string, never>;

// Hardcoded graph data with 'val' for size and custom link distance
const graphData = {
    nodes: [
        { id: 'A', name: 'Node A', val: 10 },
        { id: 'B', name: 'Node B', val: 5 },
        { id: 'C', name: 'Node C', val: 5 },
        { id: 'D', name: 'Node D', val: 5 },
        { id: 'E', name: 'Node E', val: 8 },
        { id: 'F', name: 'Node F', val: 3 },
    ],
    links: [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' },
        { source: 'B', target: 'D' },
        { source: 'C', target: 'D' },
        { source: 'E', target: 'A' },
        { source: 'F', target: 'A' },
    ],
};

// Function to draw nodes with labels
const drawNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Calculate radius based on node value (adjust multiplier as needed)
    const radius = Math.sqrt(node.val) * 1.5;
    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || 'lightblue'; // Use node color or default
    ctx.fill();

    // Draw label text
    const label = node.name;
    const fontSize = 12 / globalScale; // Adjust font size based on zoom
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black'; // Label color
    ctx.fillText(label, node.x, node.y);
};

class NewDiseasesBox extends React.Component<NewDiseasesBoxProps> {
    render() {
        return (
            <Box sx={{ width: '100%', height: '400px', border: '1px solid #ccc', borderRadius: 1 }}>
                <ForceGraph2D
                    graphData={graphData}
                    nodeVal="val"
                    nodeCanvasObject={drawNode}
                    linkDirectionalParticles={0}
                    linkWidth={2}
                    height={400}
                />
            </Box>
        );
    }
}

export default NewDiseasesBox;
