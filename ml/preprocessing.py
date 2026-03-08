"""
SmartRoute ML Pipeline - Preprocessing Module
==============================================
Handles data cleaning, missing values, and encoding.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
import logging

logger = logging.getLogger(__name__)


class TrafficDataPreprocessor:
    """Handles all preprocessing tasks for traffic data."""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.label_encoders = {}
        self.scaler = None
        self.imputers = {}
        
    def handle_missing_values(self, strategy: str = 'auto'):
        """Handle missing values in the dataset."""
        logger.info("Handling missing values...")
        
        missing_before = self.df.isnull().sum().sum()
        
        if strategy == 'auto':
            # Handle numeric columns
            numeric_cols = self.df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                numeric_imputer = SimpleImputer(strategy='median')
                self.df[numeric_cols] = numeric_imputer.fit_transform(self.df[numeric_cols])
                self.imputers['numeric'] = numeric_imputer
            
            # Handle categorical columns
            categorical_cols = self.df.select_dtypes(include=['object']).columns
            if len(categorical_cols) > 0:
                categorical_imputer = SimpleImputer(strategy='most_frequent')
                self.df[categorical_cols] = categorical_imputer.fit_transform(self.df[categorical_cols])
                self.imputers['categorical'] = categorical_imputer
            
            missing_after = self.df.isnull().sum().sum()
            logger.info(f"✓ Imputed missing values: {missing_before} → {missing_after}")
        
        return self.df
    
    def encode_categorical_variables(self, columns=None):
        """Encode categorical variables using Label Encoding."""
        logger.info("Encoding categorical variables...")
        
        if columns is None:
            columns = self.df.select_dtypes(include=['object']).columns.tolist()
        
        encoded_count = 0
        for col in columns:
            if col in self.df.columns:
                le = LabelEncoder()
                self.df[col] = le.fit_transform(self.df[col].astype(str))
                self.label_encoders[col] = le
                encoded_count += 1
        
        logger.info(f"✓ Encoded {encoded_count} categorical columns")
        return self.df
    
    def remove_duplicates(self):
        """Remove duplicate rows."""
        before_count = len(self.df)
        self.df = self.df.drop_duplicates()
        after_count = len(self.df)
        
        removed = before_count - after_count
        if removed > 0:
            logger.info(f"✓ Removed {removed} duplicate rows")
        else:
            logger.info("✓ No duplicate rows found")
        
        return self.df
    
    def handle_outliers(self, columns=None, method='iqr', threshold=1.5):
        """Handle outliers using IQR method."""
        logger.info(f"Handling outliers using {method} method...")
        
        if columns is None:
            columns = self.df.select_dtypes(include=[np.number]).columns.tolist()
        
        total_outliers = 0
        
        for col in columns:
            if col not in self.df.columns:
                continue
            
            Q1 = self.df[col].quantile(0.25)
            Q3 = self.df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - threshold * IQR
            upper_bound = Q3 + threshold * IQR
            
            outliers = ((self.df[col] < lower_bound) | (self.df[col] > upper_bound)).sum()
            self.df[col] = self.df[col].clip(lower=lower_bound, upper=upper_bound)
            
            total_outliers += outliers
        
        if total_outliers > 0:
            logger.info(f"✓ Handled {total_outliers} outliers")
        
        return self.df
    
    def normalize_column_names(self):
        """Normalize column names (lowercase, replace spaces)."""
        logger.info("Normalizing column names...")
        
        self.df.columns = (
            self.df.columns
            .str.lower()
            .str.replace(' ', '_')
            .str.replace('[^a-z0-9_]', '', regex=True)
        )
        
        logger.info(f"✓ Column names normalized")
        return self.df
    
    def preprocess_pipeline(self, 
                          normalize_names=True,
                          handle_missing='auto',
                          remove_dupes=True,
                          encode_categorical=True,
                          handle_outliers_flag=True,
                          scale=False):
        """Complete preprocessing pipeline."""
        logger.info("="*80)
        logger.info("STARTING PREPROCESSING PIPELINE")
        logger.info("="*80)
        
        initial_shape = self.df.shape
        
        if normalize_names:
            self.normalize_column_names()
        
        if remove_dupes:
            self.remove_duplicates()
        
        if handle_missing:
            self.handle_missing_values(strategy=handle_missing)
        
        if encode_categorical:
            self.encode_categorical_variables()
        
        if handle_outliers_flag:
            numeric_cols = self.df.select_dtypes(include=[np.number]).columns.tolist()
            if len(numeric_cols) > 0:
                self.handle_outliers(columns=numeric_cols)
        
        final_shape = self.df.shape
        
        logger.info("="*80)
        logger.info("PREPROCESSING COMPLETE")
        logger.info(f"Shape: {initial_shape} → {final_shape}")
        logger.info("="*80)
        
        return self.df
    
    def get_processed_data(self):
        """Get the processed dataframe."""
        return self.df


# Test if run directly
if __name__ == "__main__":
    from data_loader import TrafficDataLoader
    
    loader = TrafficDataLoader("../data/Banglore_traffic_Dataset.csv")
    df = loader.load_data()
    
    preprocessor = TrafficDataPreprocessor(df)
    df_processed = preprocessor.preprocess_pipeline()
    
    print("\n" + "="*80)
    print("PROCESSED DATA PREVIEW")
    print("="*80)
    print(df_processed.head())
    print(f"\nShape: {df_processed.shape}")