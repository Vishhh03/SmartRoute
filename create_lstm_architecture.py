"""
Generate LSTM Architecture Diagram for Research Paper
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

# Create figure
fig, ax = plt.subplots(1, 1, figsize=(10, 12))
ax.set_xlim(0, 10)
ax.set_ylim(0, 14)
ax.axis('off')

# Define colors
color_input = '#e3f2fd'
color_lstm = '#90caf9'
color_dropout = '#ffcc80'
color_dense = '#a5d6a7'
color_output = '#ef9a9a'

# Helper function to create boxes
def create_box(ax, x, y, width, height, text, color, fontsize=11):
    box = FancyBboxPatch((x, y), width, height, 
                         boxstyle="round,pad=0.1", 
                         edgecolor='black', 
                         facecolor=color, 
                         linewidth=2)
    ax.add_patch(box)
    ax.text(x + width/2, y + height/2, text, 
           ha='center', va='center', 
           fontsize=fontsize, fontweight='bold')

# Helper function to create arrows
def create_arrow(ax, x1, y1, x2, y2):
    arrow = FancyArrowPatch((x1, y1), (x2, y2),
                           arrowstyle='->', 
                           mutation_scale=30, 
                           linewidth=2.5,
                           color='black')
    ax.add_patch(arrow)

# Title
ax.text(5, 13.5, 'LSTM Neural Network Architecture', 
        ha='center', fontsize=16, fontweight='bold')
ax.text(5, 13, 'for Traffic Volume Prediction', 
        ha='center', fontsize=12, style='italic')

# Input Layer
create_box(ax, 2.5, 11.5, 5, 0.8, 'Input Layer\n(Sequence: 24 hours × 36 features)', 
          color_input, fontsize=10)
create_arrow(ax, 5, 11.5, 5, 10.8)

# LSTM Layer 1
create_box(ax, 2, 10, 6, 1, 'LSTM Layer 1\n50 units, return_sequences=True', 
          color_lstm, fontsize=10)
ax.text(8.5, 10.5, '← Temporal\n   Dependencies', 
       ha='left', fontsize=8, style='italic')
create_arrow(ax, 5, 10, 5, 9.3)

# Dropout 1
create_box(ax, 2.5, 8.5, 5, 0.8, 'Dropout (rate=0.2)', 
          color_dropout, fontsize=10)
ax.text(8, 8.9, '← Regularization', 
       ha='left', fontsize=8, style='italic')
create_arrow(ax, 5, 8.5, 5, 7.8)

# LSTM Layer 2
create_box(ax, 2, 7, 6, 1, 'LSTM Layer 2\n25 units, return_sequences=False', 
          color_lstm, fontsize=10)
ax.text(8.5, 7.5, '← Feature\n   Extraction', 
       ha='left', fontsize=8, style='italic')
create_arrow(ax, 5, 7, 5, 6.3)

# Dropout 2
create_box(ax, 2.5, 5.5, 5, 0.8, 'Dropout (rate=0.2)', 
          color_dropout, fontsize=10)
create_arrow(ax, 5, 5.5, 5, 4.8)

# Dense Layer
create_box(ax, 2.5, 4, 5, 0.8, 'Dense Layer (1 unit, activation=linear)', 
          color_dense, fontsize=10)
create_arrow(ax, 5, 4, 5, 3.3)

# Output Layer
create_box(ax, 2.5, 2.5, 5, 0.8, 'Output: Predicted Traffic Volume', 
          color_output, fontsize=10)

# Add specifications box
# Add specifications box (better formatted)


 

# Add legend
legend_elements = [
    mpatches.Patch(facecolor=color_input, edgecolor='black', label='Input Layer'),
    mpatches.Patch(facecolor=color_lstm, edgecolor='black', label='LSTM Layers'),
    mpatches.Patch(facecolor=color_dropout, edgecolor='black', label='Dropout Layers'),
    mpatches.Patch(facecolor=color_dense, edgecolor='black', label='Dense Layer'),
    mpatches.Patch(facecolor=color_output, edgecolor='black', label='Output Layer')
]
ax.legend(handles=legend_elements, loc='upper right', fontsize=9)

plt.tight_layout()
plt.savefig('results/figures/lstm_architecture.png', dpi=300, bbox_inches='tight')
print("✅ LSTM architecture diagram saved to results/figures/lstm_architecture.png")
plt.close()