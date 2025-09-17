# DeepStack Metrics & Analytics

## 📊 Overview

This document outlines the metrics and analytics system for DeepStack, a poker room management application. The system is designed to provide real-time insights into room operations, player behavior, and business performance.

## 🎯 Core Metrics

### Room-Level Metrics

#### **Capacity Utilization**

- **Formula**: `(active_players / total_seats) * 100`
- **Purpose**: Monitor room capacity and identify peak/off-peak hours
- **Target**: 70-85% utilization during peak hours

#### **Game Popularity**

- **Metrics**: Most played game types by hour/day/week
- **Purpose**: Optimize game mix and table allocation
- **Data Points**: Game type, player count, session duration

#### **Average Wait Time**

- **Formula**: `AVG(time_from_waitlist_entry_to_seating)`
- **Purpose**: Measure customer experience and operational efficiency
- **Target**: < 15 minutes for popular games

#### **Revenue per Hour**

- **Formula**: `SUM(rake_collected) / hours_operated`
- **Purpose**: Track financial performance
- **Components**: Rake, tournament fees, side games

#### **Player Retention**

- **Formula**: `(returning_players / total_players) * 100`
- **Purpose**: Measure customer loyalty and satisfaction
- **Timeframes**: Daily, weekly, monthly retention rates

### Game-Level Metrics

#### **Fill Rate**

- **Formula**: `(current_players / max_players) * 100`
- **Purpose**: Monitor game demand and table efficiency
- **Target**: 80-90% fill rate for active games

#### **Turnover Rate**

- **Formula**: `players_per_hour`
- **Purpose**: Measure game activity and player flow
- **Calculation**: Total players seated / hours game was active

#### **Average Session Length**

- **Formula**: `AVG(end_time - start_time)`
- **Purpose**: Understand player engagement and game dynamics
- **Benchmarks**:
  - Cash games: 2-4 hours
  - Tournaments: 3-6 hours

#### **Peak Hours**

- **Metrics**: Hourly player counts and game activity
- **Purpose**: Optimize staffing and table allocation
- **Visualization**: Heat maps showing activity by hour/day

### Table-Level Metrics

#### **Utilization Rate**

- **Formula**: `(current_players / seat_count) * 100`
- **Purpose**: Monitor individual table performance
- **Target**: 85-95% utilization for active tables

#### **Revenue per Table**

- **Formula**: `rake_generated / table_hours`
- **Purpose**: Identify most profitable tables and games
- **Components**: Rake, side bets, tournament fees

#### **Average Occupancy**

- **Formula**: `AVG(players_per_hour) over time_period`
- **Purpose**: Long-term table performance analysis
- **Timeframes**: Daily, weekly, monthly averages

### Player-Level Metrics

#### **Session History**

- **Data Points**: Games played, buy-ins, session duration
- **Purpose**: Track player preferences and behavior patterns
- **Privacy**: Anonymized for analytics, detailed for individual players

#### **Preferred Games**

- **Metrics**: Most played game types, stakes, times
- **Purpose**: Personalized recommendations and marketing
- **Calculation**: Frequency and duration by game type

#### **Average Buy-in**

- **Formula**: `AVG(buy_in_amount)`
- **Purpose**: Understand player spending patterns
- **Segmentation**: By game type, time of day, player tier

#### **Visit Frequency**

- **Metrics**: Days between visits, total visits per month
- **Purpose**: Identify VIP players and at-risk customers
- **Categories**: Daily, weekly, monthly, occasional players

## 🔧 Technical Implementation

### RPC Functions

#### **Core Count Functions**

```sql
-- Single adaptable function for all counts
get_room_counts(room_id, include_inactive = false, entity_type = 'all')
-- Returns: operators, games, tables, waitlist_entries, tournaments

-- Single adaptable function for game stats
get_game_stats(game_id, include_inactive = false, time_period = 'today')
-- Returns: current_players, waitlist_count, revenue, session_count
```

#### **Analytics Functions**

```sql
-- Room analytics
get_room_analytics(room_id, time_period = 'today')
-- Returns: utilization, revenue, popular_games, player_activity

-- Game analytics
get_game_analytics(game_id, time_period = 'today')
-- Returns: fill_rate, turnover, avg_session_length, peak_hours

-- Player analytics
get_player_analytics(player_id, time_period = '30_days')
-- Returns: session_count, preferred_games, avg_buy_in, frequency
```

### Database Structure

#### **Optimized Tables**

- **Games**: Removed redundant count columns (current_players, waitlist_count)
- **Tables**: Changed status enum to is_active boolean
- **Indexes**: Added performance indexes for common query patterns

#### **Real-time Calculations**

- **Player Counts**: Calculated from player_sessions table
- **Waitlist Counts**: Calculated from waitlist_entries table
- **Revenue**: Calculated from rake and fee transactions

## 📈 Future Enhancements

### Phase 1: Real-time Analytics Dashboard

- **Live Room Metrics**: Real-time capacity, wait times, game activity
- **Operator Alerts**: Low utilization, long wait times, capacity issues
- **Player Notifications**: Wait time estimates, game availability

### Phase 2: Predictive Analytics

- **Wait Time Predictions**: ML models for accurate wait time estimates
- **Demand Forecasting**: Predict peak hours and game popularity
- **Capacity Planning**: Optimal table/game mix recommendations

### Phase 3: Revenue Optimization

- **Dynamic Rake Suggestions**: Optimal rake rates based on demand
- **Game Mix Optimization**: Data-driven game type recommendations
- **Pricing Strategies**: Dynamic pricing based on demand and competition

### Phase 4: Player Behavior Analysis

- **Retention Insights**: Identify factors affecting player retention
- **Churn Prediction**: Early warning system for at-risk players
- **Personalization**: Tailored game recommendations and promotions

### Phase 5: Advanced Analytics

- **Cohort Analysis**: Player behavior by acquisition date
- **A/B Testing**: Test different game mixes, rake structures, promotions
- **Competitive Analysis**: Benchmark against industry standards

## 🎨 Dashboard Design

### **Superadmin Dashboard**

- **Multi-room Overview**: All rooms with key metrics
- **Performance Comparison**: Room-to-room analytics
- **System-wide Trends**: Overall business performance

### **Room Admin Dashboard**

- **Current Status**: Live room metrics and alerts
- **Historical Trends**: Performance over time
- **Operational Tools**: Quick actions for room management

### **Player Dashboard**

- **Personal Stats**: Individual session history and preferences
- **Game Availability**: Current games and wait times
- **Social Features**: Friend activity and achievements

## 🔒 Privacy & Security

### **Data Protection**

- **Anonymization**: Player data anonymized for analytics
- **Consent**: Clear opt-in for data collection
- **Retention**: Automatic data purging after defined periods

### **Access Control**

- **Role-based Access**: Different metrics for different user types
- **Audit Logging**: Track who accesses what data
- **Data Encryption**: Sensitive data encrypted at rest and in transit

## 📊 Key Performance Indicators (KPIs)

### **Operational KPIs**

- **Room Utilization**: Target 70-85% during peak hours
- **Average Wait Time**: Target < 15 minutes
- **Table Fill Rate**: Target 80-90%
- **Player Retention**: Target 60% monthly retention

### **Financial KPIs**

- **Revenue per Hour**: Track hourly revenue generation
- **Revenue per Table**: Identify most profitable setups
- **Player Lifetime Value**: Long-term player value
- **Rake Efficiency**: Rake collected vs. potential

### **Customer Experience KPIs**

- **Wait Time Satisfaction**: Player feedback on wait times
- **Game Availability**: Percentage of time preferred games available
- **Staff Responsiveness**: Time to resolve player issues
- **Overall Satisfaction**: Regular player surveys

## 🚀 Implementation Roadmap

### **Phase 1 (Current)**

- ✅ Database optimization and cleanup
- ✅ Core RPC functions for basic metrics
- ✅ Performance indexes
- 🔄 Basic dashboard implementation

### **Phase 2 (Next 3 months)**

- 📋 Real-time analytics dashboard
- 📋 Player behavior tracking
- 📋 Revenue analytics
- 📋 Mobile-responsive design

### **Phase 3 (6 months)**

- 📋 Predictive analytics
- 📋 Machine learning models
- 📋 Advanced reporting
- 📋 API for third-party integrations

### **Phase 4 (12 months)**

- 📋 AI-powered recommendations
- 📋 Automated optimization
- 📋 Advanced player insights
- 📋 Competitive benchmarking

## 📚 Resources

### **Related Documentation**

- [Database Schema](database.md)
- [API Documentation](api.md)
- [Authentication](auth.md)

### **External Resources**

- Poker room industry benchmarks
- Customer experience best practices
- Data analytics methodologies
- Privacy regulations (GDPR, CCPA)

---

_This document is living and will be updated as the metrics system evolves._
