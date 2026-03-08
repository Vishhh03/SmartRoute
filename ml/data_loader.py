"""
SmartRoute ML Pipeline - Data Loader Module
============================================
Handles data loading, validation, and initial processing
for the traffic prediction system.

Author: Research Team
Institution: SRM Institute of Science and Technology
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TrafficDataLoader:
    """
    Handles loading and initial validation of traffic data.
    
    Attributes:
        data_path (Path): Path to the traffic dataset
        df (pd.DataFrame): Loaded dataframe
        metadata (dict): Dataset metadata and statistics
    """
    
    def __init__(self, data_path: str):
        """
        Initialize the data loader.
        
        Args:
            data_path (str): Path to the CSV file
        """
        self.data_path = Path(data_path)
        self.df = None
        self.metadata = {}
        
    def load_data(self) -> pd.DataFrame:
        """
        Load traffic data from CSV file.
        
        Returns:
            pd.DataFrame: Loaded traffic data
            
        Raises:
            FileNotFoundError: If data file doesn't exist
            ValueError: If data is empty or invalid
        """
        if not self.data_path.exists():
            raise FileNotFoundError(f"Data file not found: {self.data_path}")
        
        logger.info(f"Loading data from: {self.data_path}")
        
        try:
            self.df = pd.read_csv(self.data_path)
            logger.info(f"✓ Data loaded successfully: {self.df.shape[0]} rows, {self.df.shape[1]} columns")
            
            # Validate data
            self._validate_data()
            
            # Generate metadata
            self._generate_metadata()
            
            return self.df
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise
    
    def _validate_data(self):
        """Validate the loaded data for basic requirements."""
        if self.df is None or self.df.empty:
            raise ValueError("Loaded dataframe is empty")
        
        # Check for minimum required columns
        required_patterns = ['traffic', 'volume', 'speed', 'congestion']
        column_names_lower = [col.lower() for col in self.df.columns]
        
        has_traffic_col = any(
            any(pattern in col for pattern in required_patterns)
            for col in column_names_lower
        )
        
        if not has_traffic_col:
            logger.warning("⚠️ Could not identify standard traffic columns")
        
        # Check for excessive missing values
        missing_pct = (self.df.isnull().sum() / len(self.df)) * 100
        critical_missing = missing_pct[missing_pct > 50]
        
        if not critical_missing.empty:
            logger.warning(f"⚠️ Columns with >50% missing values: {list(critical_missing.index)}")
        
        logger.info("✓ Data validation complete")
    
    def _generate_metadata(self):
        """Generate metadata about the dataset."""
        self.metadata = {
            'shape': self.df.shape,
            'columns': list(self.df.columns),
            'dtypes': self.df.dtypes.to_dict(),
            'missing_values': self.df.isnull().sum().to_dict(),
            'numeric_columns': list(self.df.select_dtypes(include=[np.number]).columns),
            'categorical_columns': list(self.df.select_dtypes(include=['object']).columns),
            'memory_usage_mb': self.df.memory_usage(deep=True).sum() / 1024**2
        }
        
        logger.info(f"✓ Metadata generated: {len(self.metadata['numeric_columns'])} numeric, "
                   f"{len(self.metadata['categorical_columns'])} categorical columns")
    
    def get_basic_stats(self) -> pd.DataFrame:
        """
        Get basic statistical summary of the dataset.
        
        Returns:
            pd.DataFrame: Statistical summary
        """
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")
        
        return self.df.describe()
    
    def get_column_info(self) -> pd.DataFrame:
        """
        Get detailed information about each column.
        
        Returns:
            pd.DataFrame: Column information including type, missing values, unique count
        """
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")
        
        info_df = pd.DataFrame({
            'Column': self.df.columns,
            'Type': self.df.dtypes.values,
            'Non-Null Count': self.df.count().values,
            'Null Count': self.df.isnull().sum().values,
            'Null %': (self.df.isnull().sum() / len(self.df) * 100).values,
            'Unique Values': [self.df[col].nunique() for col in self.df.columns]
        })
        
        return info_df
    
    def identify_target_variable(self) -> Optional[str]:
        """
        Automatically identify the target variable (Traffic Volume).
        
        Returns:
            str: Name of the target column, or None if not found
        """
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")
        
        # Search patterns for target variable
        target_patterns = [
            'traffic_volume', 'trafficvolume', 'volume',
            'traffic vol', 'traffic', 'total_vehicles'
        ]
        
        for col in self.df.columns:
            col_lower = col.lower().replace(' ', '_')
            for pattern in target_patterns:
                if pattern in col_lower:
                    logger.info(f"✓ Target variable identified: {col}")
                    return col
        
        logger.warning("⚠️ Could not automatically identify target variable")
        return None
    
    def split_features_target(self, target_col: str) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Split data into features and target.
        
        Args:
            target_col (str): Name of the target column
            
        Returns:
            Tuple[pd.DataFrame, pd.Series]: Features (X) and target (y)
        """
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")
        
        if target_col not in self.df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset")
        
        X = self.df.drop(columns=[target_col])
        y = self.df[target_col]
        
        logger.info(f"✓ Data split: Features shape {X.shape}, Target shape {y.shape}")
        
        return X, y
    
    def save_processed_data(self, output_path: str):
        """
        Save the loaded data to a new file.
        
        Args:
            output_path (str): Path to save the processed data
        """
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.df.to_csv(output_path, index=False)
        logger.info(f"✓ Data saved to: {output_path}")


# Example usage
if __name__ == "__main__":
    # Initialize loader
    loader = TrafficDataLoader("../data/Banglore_traffic_Dataset.csv")
    
    # Load data
    df = loader.load_data()
    
    # Get statistics
    print("\n" + "="*80)
    print("DATASET STATISTICS")
    print("="*80)
    print(loader.get_basic_stats())
    
    # Get column information
    print("\n" + "="*80)
    print("COLUMN INFORMATION")
    print("="*80)
    print(loader.get_column_info())
    
    # Identify target
    target = loader.identify_target_variable()
    if target:
        X, y = loader.split_features_target(target)
        print(f"\n✓ Features: {X.shape}, Target: {y.shape}")