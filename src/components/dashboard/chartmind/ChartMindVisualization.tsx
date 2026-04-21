/**
 * ChartMind D3 Visualization - MVP TypeScript Version
 * 
 * A simple network graph showing diagnoses arranged by likelihood
 */

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import * as d3 from 'd3';

// Types
export interface Diagnosis {
  condition: string;
  likelihood: string | number;
  urgent?: boolean;
  rationale?: string;
}

interface VisualizationNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'center' | 'diagnosis';
  color: string;
  likelihood?: number;
  urgent?: boolean;
  originalData?: Diagnosis;
  // D3 simulation adds these, but we need to declare them
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  targetX?: number;
  targetY?: number;
}

interface VisualizationLink extends d3.SimulationLinkDatum<VisualizationNode> {
  source: string | VisualizationNode;
  target: string | VisualizationNode;
}

interface ChartMindVisualizationProps {
  diagnoses?: Diagnosis[];
  selectedIds?: string[];
  onDiagnosisClick?: (diagnosis: Diagnosis) => void;
  width?: number;
  height?: number;
}

interface TooltipState {
  visible: boolean;
  diagnosis: Diagnosis | null;
  x: number;
  y: number;
}

export interface ChartMindVisualizationRef {
  getSvgRef: () => React.RefObject<SVGSVGElement>;
}

const NODE_RADIUS = 14;
const FONT_SIZE = 12;
const MIN_HEIGHT = 450;

/**
 * ChartMindVisualization - Network Graph Component
 */
const ChartMindVisualization = forwardRef<ChartMindVisualizationRef, ChartMindVisualizationProps>(
  (
    {
      diagnoses = [],
      selectedIds = [],
      onDiagnosisClick,
      width = 600,
      height = MIN_HEIGHT,
    },
    ref
  ) => {
    const theme = useTheme();
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<d3.Simulation<VisualizationNode, VisualizationLink> | null>(null);
    const callbackRef = useRef(onDiagnosisClick);
    const selectedIdsRef = useRef(selectedIds);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Tooltip state
    const [tooltip, setTooltip] = useState<TooltipState>({
      visible: false,
      diagnosis: null,
      x: 0,
      y: 0,
    });
    
    // Keep refs updated
    useEffect(() => {
      callbackRef.current = onDiagnosisClick;
    }, [onDiagnosisClick]);
    
    useEffect(() => {
      selectedIdsRef.current = selectedIds;
    }, [selectedIds]);

    useImperativeHandle(ref, () => ({
      getSvgRef: () => svgRef,
    }));

    // Build graph when diagnoses change
    useEffect(() => {
      if (!diagnoses || diagnoses.length === 0 || !svgRef.current) return;

      const buildGraph = () => {
        try {
          // Parse likelihood from string to number
          const parseLikelihood = (likelihood: string | number): number => {
            if (typeof likelihood === 'number') return likelihood;
            if (typeof likelihood === 'string') {
              // Extract percentage if present: "More likely (75%)" -> 75
              const match = likelihood.match(/(\d+)%/);
              if (match) return parseInt(match[1], 10);
              // Fallback: categorize by keywords
              const lower = likelihood.toLowerCase();
              if (lower.includes('more likely')) return 70;
              if (lower.includes('less likely')) return 30;
            }
            return 50; // default
          };

          // Create nodes: center + diagnoses
          const centerNode: VisualizationNode = {
            id: 'center',
            name: 'Symptoms',
            type: 'center',
            color: theme.palette.primary.main,
            fx: width / 2,
            fy: height / 2,
          };

          const diagnosisNodes: VisualizationNode[] = diagnoses.map((dx) => ({
            id: dx.condition,
            name: dx.condition,
            type: 'diagnosis',
            likelihood: parseLikelihood(dx.likelihood),
            urgent: dx.urgent || false,
            color: dx.urgent ? theme.palette.error.main : theme.palette.primary.main,
            originalData: dx,
          }));

          const allNodes: VisualizationNode[] = [centerNode, ...diagnosisNodes];

          // Create links: center connects to all diagnoses
          const allLinks: VisualizationLink[] = diagnosisNodes.map(node => ({
            source: 'center',
            target: node.id,
          }));

          // Sort diagnoses by likelihood (highest first)
          diagnosisNodes.sort((a, b) => (b.likelihood || 50) - (a.likelihood || 50));

          // Clear previous SVG content
          const svg = d3.select(svgRef.current);
          svg.selectAll('*').remove();
          svg.attr('width', width).attr('height', height);

          const container = svg.append('g');

          // Position nodes in a circle around center
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.min(width, height) * 0.35;

          // Calculate initial positions - spread diagnoses in a circle
          diagnosisNodes.forEach((node, idx) => {
            const angle = (idx / diagnosisNodes.length) * 2 * Math.PI - Math.PI / 2;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
          });

          // Create D3 force simulation
          const simulation = d3
            .forceSimulation<VisualizationNode>(allNodes)
            .alpha(0.3)
            .alphaDecay(0.05)
            .velocityDecay(0.4)
            .force(
              'link',
              d3.forceLink<VisualizationNode, VisualizationLink>(allLinks)
                .id(d => d.id)
                .distance(radius * 0.8)
                .strength(0.2)
            )
            .force('charge', d3.forceManyBody<VisualizationNode>().strength(-20))
            .force('collision', d3.forceCollide<VisualizationNode>().radius(NODE_RADIUS + 30))
            .force(
              'radial',
              d3.forceRadial<VisualizationNode>(
                d => (d.id === 'center' ? 0 : radius),
                centerX,
                centerY
              ).strength(0.1)
            );

          simulationRef.current = simulation;

          // Create links
          const link = container
            .append('g')
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 1.5)
            .selectAll('line')
            .data(allLinks)
            .enter()
            .append('line');

          // Create nodes
          const node = container
            .append('g')
            .selectAll('circle')
            .data(allNodes)
            .enter()
            .append('circle')
            .attr('r', NODE_RADIUS)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2.5)
            .style('cursor', d => d.type === 'diagnosis' ? 'pointer' : 'default')
            // D3 v5: click handler receives (datum, index, nodes) - no event first!
            .on('click', function(d: VisualizationNode) {
              console.log('[Viz] Node clicked:', d.id, d.type);
              if (d.type === 'diagnosis' && callbackRef.current && d.originalData) {
                console.log('[Viz] Calling callback with:', d.originalData);
                callbackRef.current(d.originalData);
              }
            })
            .on('mouseenter', function(d: VisualizationNode) {
              if (d.type === 'diagnosis') {
                d3.select(this)
                  .transition()
                  .duration(150)
                  .attr('r', NODE_RADIUS * 1.3);
                
                // Show tooltip after small delay
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                }
                hoverTimeoutRef.current = setTimeout(() => {
                  if (d.originalData && containerRef.current) {
                    const containerRect = containerRef.current.getBoundingClientRect();
                    const nodeX = d.x || 0;
                    const nodeY = d.y || 0;
                    setTooltip({
                      visible: true,
                      diagnosis: d.originalData,
                      x: nodeX,
                      y: nodeY - NODE_RADIUS - 10,
                    });
                  }
                }, 200);
              }
            })
            .on('mouseleave', function(d: VisualizationNode) {
              if (d.type === 'diagnosis') {
                const isSelected = selectedIdsRef.current.includes(d.id);
                d3.select(this)
                  .transition()
                  .duration(150)
                  .attr('r', isSelected ? NODE_RADIUS * 1.5 : NODE_RADIUS);
                
                // Hide tooltip
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
                setTooltip(prev => ({ ...prev, visible: false }));
              }
            });

          // Create labels
          const labelBackground = container
            .append('g')
            .selectAll('rect')
            .data(allNodes)
            .enter()
            .append('rect')
            .attr('fill', 'rgba(255, 255, 255, 0.95)')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 0.5)
            .attr('rx', 4)
            .attr('ry', 4);

          const label = container
            .append('g')
            .selectAll('text')
            .data(allNodes)
            .enter()
            .append('text')
            .text(d => {
              // Truncate long names
              if (d.name.length > 24) return d.name.substring(0, 22) + '...';
              return d.name;
            })
            .attr('font-size', FONT_SIZE)
            .attr('text-anchor', 'middle')
            .attr('fill', '#1e293b')
            .attr('font-weight', d => d.type === 'center' ? 600 : 500);

          // Update positions on tick
          simulation.on('tick', () => {
            link
              .attr('x1', d => (d.source as VisualizationNode).x!)
              .attr('y1', d => (d.source as VisualizationNode).y!)
              .attr('x2', d => (d.target as VisualizationNode).x!)
              .attr('y2', d => (d.target as VisualizationNode).y!);

            node
              .attr('cx', d => d.x!)
              .attr('cy', d => d.y!);

            label
              .attr('x', d => d.x!)
              .attr('y', d => d.y! + NODE_RADIUS + 16);

            labelBackground
              .attr('x', d => {
                const displayName = d.name.length > 24 ? d.name.substring(0, 22) + '...' : d.name;
                const textLength = displayName.length * FONT_SIZE * 0.6;
                return d.x! - textLength / 2 - 5;
              })
              .attr('y', d => d.y! + NODE_RADIUS + 16 - FONT_SIZE + 1)
              .attr('width', d => {
                const displayName = d.name.length > 24 ? d.name.substring(0, 22) + '...' : d.name;
                const textLength = displayName.length * FONT_SIZE * 0.6;
                return textLength + 10;
              })
              .attr('height', FONT_SIZE + 6);
          });

          return () => simulation.stop();
        } catch (err) {
          console.error('D3 rendering error:', err);
        }
      };

      buildGraph();
    }, [diagnoses, width, height, theme]); // Removed onDiagnosisClick to prevent re-render on every click

    // Update visual state for selected diagnoses
    useEffect(() => {
      if (!svgRef.current) return;

      const svg = d3.select(svgRef.current);
      const nodes = svg.selectAll<SVGCircleElement, VisualizationNode>('circle');
      
      // Remove any existing drop shadows
      svg.select('defs').remove();
      
      // Add drop shadow definition for selected nodes
      if (selectedIds.length > 0) {
        const defs = svg.insert('defs', ':first-child');
        const filter = defs.append('filter')
          .attr('id', 'selected-glow')
          .attr('x', '-50%')
          .attr('y', '-50%')
          .attr('width', '200%')
          .attr('height', '200%');
        
        filter.append('feGaussianBlur')
          .attr('stdDeviation', '4')
          .attr('result', 'coloredBlur');
        
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
      }

      nodes
        .transition()
        .duration(200)
        .attr('stroke', d => {
          if (d.type === 'center') return '#fff';
          return selectedIds.includes(d.id) ? theme.palette.common.white : '#fff';
        })
        .attr('stroke-width', d => {
          if (d.type === 'center') return 2.5;
          return selectedIds.includes(d.id) ? 6 : 2.5;
        })
        .attr('r', d => {
          if (d.type === 'center') return NODE_RADIUS;
          return selectedIds.includes(d.id) ? NODE_RADIUS * 1.5 : NODE_RADIUS;
        })
        .attr('filter', d => {
          if (d.type === 'center') return null;
          return selectedIds.includes(d.id) ? 'url(#selected-glow)' : null;
        });
    }, [selectedIds, theme]);

    // Get likelihood display
    const getLikelihoodDisplay = (likelihood: string | number | undefined): { label: string; color: string } => {
      if (!likelihood) return { label: '', color: theme.palette.text.secondary };
      
      const likelihoodStr = typeof likelihood === 'number' 
        ? (likelihood >= 60 ? 'More likely' : likelihood >= 40 ? 'Likely' : 'Less likely')
        : likelihood;
      
      const lower = likelihoodStr.toLowerCase();
      if (lower.includes('more likely')) return { label: 'More likely', color: theme.palette.success.main };
      if (lower.includes('less likely')) return { label: 'Less likely', color: theme.palette.text.secondary };
      return { label: likelihoodStr, color: theme.palette.primary.main };
    };

    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: MIN_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
        
        {/* Hover Tooltip */}
        {tooltip.visible && tooltip.diagnosis && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e2e8f0',
              maxWidth: '280px',
              minWidth: '200px',
              pointerEvents: 'none',
              zIndex: 100,
            }}
          >
            {/* Name + Urgent badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                {tooltip.diagnosis.condition}
              </span>
              {tooltip.diagnosis.urgent && (
                <span style={{
                  backgroundColor: theme.palette.error.main,
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}>
                  Urgent
                </span>
              )}
            </div>
            
            {/* Likelihood */}
            {tooltip.diagnosis.likelihood && (
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: getLikelihoodDisplay(tooltip.diagnosis.likelihood).color,
                marginBottom: '6px',
              }}>
                {getLikelihoodDisplay(tooltip.diagnosis.likelihood).label}
              </div>
            )}
            
            {/* Rationale */}
            {tooltip.diagnosis.rationale && (
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}>
                {tooltip.diagnosis.rationale}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ChartMindVisualization.displayName = 'ChartMindVisualization';

export default ChartMindVisualization;
