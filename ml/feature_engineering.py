"""
SmartRoute ML Pipeline - Feature Engineering Module
====================================================
Creates advanced features for traffic prediction.
"""

import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


class TrafficFeatureEngineer:
    """Advanced feature engineering for traffic prediction."""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.created_features = []
        
    def create_temporal_features(self):
        """Create time-based features."""
        logger.info("Creating temporal features...")
        
        # Check if we have a datetime column
        datetime_cols = [col for col in self.df.columns 
                        if 'time' in col.lower() or 'date' in col.lower()]
        
        if datetime_cols:
            try:
                col = datetime_cols[0]
                self.df[col] = pd.to_datetime(self.df[col])
                
                self.df['hour'] = self.df[col].dt.hour
                self.df['day_of_week'] = self.df[col].dt.dayofweek
                self.df['month'] = self.df[col].dt.month
                
                self.created_features.extend(['hour', 'day_of_week', 'month'])
                logger.info(f"✓ Created temporal features from {col}")
                return self.df
            except:
                pass
        
        # Create synthetic temporal features
        logger.info("Creating synthetic temporal features...")
        np.random.seed(42)
        n = len(self.df)
        
        self.df['hour'] = np.random.randint(0, 24, n)
        self.df['day_of_week'] = np.random.randint(0, 7, n)
        self.df['month'] = np.random.randint(1, 13, n)
        
        self.created_features.extend(['hour', 'day_of_week', 'month'])
        logger.info("✓ Created 3 temporal features")
        
        return self.df
    
    def create_cyclical_features(self):
        """Create sine/cosine encodings for time."""
        logger.info("Creating cyclical encodings...")
        
        features_created = 0
        
        if 'hour' in self.df.columns:
            self.df['hour_sin'] = np.sin(2 * np.pi * self.df['hour'] / 24)
            self.df['hour_cos'] = np.cos(2 * np.pi * self.df['hour'] / 24)
            features_created += 2
            self.created_features.extend(['hour_sin', 'hour_cos'])
        
        if 'day_of_week' in self.df.columns:
            self.df['dow_sin'] = np.sin(2 * np.pi * self.df['day_of_week'] / 7)
            self.df['dow_cos'] = np.cos(2 * np.pi * self.df['day_of_week'] / 7)
            features_created += 2
            self.created_features.extend(['dow_sin', 'dow_cos'])
        
        if 'month' in self.df.columns:
            self.df['month_sin'] = np.sin(2 * np.pi * self.df['month'] / 12)
            self.df['month_cos'] = np.cos(2 * np.pi * self.df['month'] / 12)
            features_created += 2
            self.created_features.extend(['month_sin', 'month_cos'])
        
        logger.info(f"✓ Created {features_created} cyclical features")
        return self.df
    
    def create_time_based_indicators(self):
        """Create binary indicators for time periods."""
        logger.info("Creating time-based indicators...")
        
        features_created = 0
        
        if 'hour' in self.df.columns:
            # Peak hours (7-10 AM, 5-8 PM)
            self.df['is_morning_peak'] = ((self.df['hour'] >= 7) & 
                                          (self.df['hour'] <= 10)).astype(int)
            self.df['is_evening_peak'] = ((self.df['hour'] >= 17) & 
                                          (self.df['hour'] <= 20)).astype(int)
            self.df['is_peak_hour'] = (self.df['is_morning_peak'] | 
                                       self.df['is_evening_peak']).astype(int)
            
            self.df['is_night'] = ((self.df['hour'] >= 22) | 
                                   (self.df['hour'] <= 5)).astype(int)
            self.df['is_business_hours'] = ((self.df['hour'] >= 9) & 
                                            (self.df['hour'] <= 17)).astype(int)
            
            features_created += 5
            self.created_features.extend(['is_morning_peak', 'is_evening_peak', 
                                         'is_peak_hour', 'is_night', 'is_business_hours'])
        
        if 'day_of_week' in self.df.columns:
            self.df['is_weekend'] = (self.df['day_of_week'] >= 5).astype(int)
            self.df['is_monday'] = (self.df['day_of_week'] == 0).astype(int)
            self.df['is_friday'] = (self.df['day_of_week'] == 4).astype(int)
            
            features_created += 3
            self.created_features.extend(['is_weekend', 'is_monday', 'is_friday'])
        
        logger.info(f"✓ Created {features_created} time indicators")
        return self.df
    
    def create_interaction_features(self):
        """Create interaction features."""
        logger.info("Creating interaction features...")
        
        features_created = 0
        
        # Find speed and congestion columns
        speed_cols = [col for col in self.df.columns if 'speed' in col.lower()]
        congestion_cols = [col for col in self.df.columns if 'congestion' in col.lower()]
        
        if speed_cols and congestion_cols:
            speed_col = speed_cols[0]
            congestion_col = congestion_cols[0]
            
            self.df['speed_congestion_interaction'] = (
                self.df[speed_col] * self.df[congestion_col]
            )
            features_created += 1
            self.created_features.append('speed_congestion_interaction')
        
        if 'hour' in self.df.columns and 'is_weekend' in self.df.columns:
            self.df['weekend_hour_interaction'] = (
                self.df['hour'] * self.df['is_weekend']
            )
            features_created += 1
            self.created_features.append('weekend_hour_interaction')
        
        if speed_cols and 'is_peak_hour' in self.df.columns:
            self.df['speed_peak_interaction'] = (
                self.df[speed_cols[0]] * self.df['is_peak_hour']
            )
            features_created += 1
            self.created_features.append('speed_peak_interaction')
        
        logger.info(f"✓ Created {features_created} interaction features")
        return self.df
    
    def create_aggregation_features(self):
        """Create aggregation features based on groupings."""
        logger.info("Creating aggregation features...")
        
        features_created = 0
        
        if 'hour' in self.df.columns:
            numeric_cols = self.df.select_dtypes(include=[np.number]).columns[:3]
            
            for col in numeric_cols:
                if col != 'hour':
                    try:
                        hour_means = self.df.groupby('hour')[col].transform('mean')
                        self.df[f'{col}_hour_avg'] = hour_means
                        features_created += 1
                        self.created_features.append(f'{col}_hour_avg')
                    except:
                        pass
        
        if 'day_of_week' in self.df.columns:
            numeric_cols = self.df.select_dtypes(include=[np.number]).columns[:3]
            
            for col in numeric_cols:
                if col != 'day_of_week':
                    try:
                        dow_means = self.df.groupby('day_of_week')[col].transform('mean')
                        self.df[f'{col}_dow_avg'] = dow_means
                        features_created += 1
                        self.created_features.append(f'{col}_dow_avg')
                    except:
                        pass
        
        logger.info(f"✓ Created {features_created} aggregation features")
        return self.df
    
    def create_domain_specific_features(self):
        """Create domain-specific features for traffic."""
        logger.info("Creating domain-specific features...")
        
        features_created = 0
        
        # Speed categories
        speed_cols = [col for col in self.df.columns if 'speed' in col.lower()]
        if speed_cols:
            speed_col = speed_cols[0]
            self.df['speed_category'] = pd.cut(
                self.df[speed_col],
                bins=[0, 20, 40, 60, 100],
                labels=[0, 1, 2, 3]
            ).astype(int)
            features_created += 1
            self.created_features.append('speed_category')
        
        # Congestion severity
        congestion_cols = [col for col in self.df.columns if 'congestion' in col.lower()]
        if congestion_cols:
            congestion_col = congestion_cols[0]
            median_congestion = self.df[congestion_col].median()
            self.df['high_congestion'] = (
                self.df[congestion_col] > median_congestion
            ).astype(int)
            features_created += 1
            self.created_features.append('high_congestion')
        
        # Road capacity indicator
        capacity_cols = [col for col in self.df.columns if 'capacity' in col.lower()]
        if capacity_cols:
            capacity_col = capacity_cols[0]
            self.df['capacity_stressed'] = (
                self.df[capacity_col] > 0.8
            ).astype(int)
            features_created += 1
            self.created_features.append('capacity_stressed')
        
        logger.info(f"✓ Created {features_created} domain-specific features")
        return self.df
    
    def engineer_features_pipeline(self,
                                  temporal=True,
                                  cyclical=True,
                                  time_indicators=True,
                                  interactions=True,
                                  aggregations=True,
                                  domain_specific=True):
        """Complete feature engineering pipeline."""
        logger.info("="*80)
        logger.info("STARTING FEATURE ENGINEERING PIPELINE")
        logger.info("="*80)
        
        initial_features = len(self.df.columns)
        
        if temporal:
            self.create_temporal_features()
        
        if cyclical:
            self.create_cyclical_features()
        
        if time_indicators:
            self.create_time_based_indicators()
        
        if interactions:
            self.create_interaction_features()
        
        if aggregations:
            self.create_aggregation_features()
        
        if domain_specific:
            self.create_domain_specific_features()
        
        final_features = len(self.df.columns)
        new_features = final_features - initial_features
        
        logger.info("="*80)
        logger.info("FEATURE ENGINEERING COMPLETE")
        logger.info(f"Initial features: {initial_features}")
        logger.info(f"Final features: {final_features}")
        logger.info(f"New features created: {new_features}")
        logger.info("="*80)
        
        return self.df
    
    def get_feature_list(self):
        """Get list of all created features."""
        return self.created_features
    
    def get_engineered_data(self):
        """Get the dataframe with engineered features."""
        return self.df
