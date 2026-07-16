def compare_calculations():
    # Excel rows data
    # (A: Start Date, B: End Date, C: Balance, D: Rate)
    data = [
        ("2023-10-01", "2023-10-11", 4059000, 0.5255),
        ("2023-10-11", "2023-10-19", 3936500, 0.5255),
        ("2023-10-19", "2023-10-24", 2967500, 0.5255),
        ("2023-10-24", "2023-11-01", 2600000, 0.5255),
        ("2023-11-01", "2023-11-03", 2230000, 0.5255),
        ("2023-11-03", "2023-11-08", 2230000, 0.5955),
        ("2023-11-08", "2023-11-15", 1900000, 0.5955),
        ("2023-11-15", "2023-11-17", 1650000, 0.5955),
        ("2023-11-17", "2023-11-24", 1117405.37, 0.5955),
        ("2023-11-24", "2023-11-28", 1117405.37, 0.46),
        ("2023-11-28", "2023-12-16", 847405.37, 0.46),
        ("2023-12-16", "2023-12-26", 847405.37, 0.48),
        ("2023-12-26", "2023-12-31", 560405.37, 0.48)
    ]
    
    from datetime import datetime
    
    excel_total_days = 0
    excel_total_interest = 0
    
    standard_total_days = 0
    standard_total_interest = 0
    
    print("--- ROW BY ROW COMPARISON ---")
    print(f"{'Row':<4} | {'Start':<10} | {'End':<10} | {'Balance':<12} | {'Rate':<6} | {'Excel Days':<10} | {'Excel Interest':<15} | {'Std Days':<10} | {'Std Interest':<15}")
    print("-" * 115)
    
    for idx, (start_str, end_str, balance, rate) in enumerate(data):
        start_date = datetime.strptime(start_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_str, "%Y-%m-%d")
        
        # Excel method: 1 + End - Start
        excel_days = (end_date - start_date).days + 1
        excel_net_interest = (balance * rate * excel_days) / 360
        excel_bsmv = excel_net_interest * 0.05
        excel_total = excel_net_interest + excel_bsmv
        
        excel_total_days += excel_days
        excel_total_interest += excel_total
        
        # Standard method: End - Start
        # Note: for the very last row, standard banking counts to Jan 1st to include Dec 31st interest
        if idx == len(data) - 1:
            std_days = (end_date - start_date).days + 1 # Include last day
        else:
            std_days = (end_date - start_date).days
            
        std_net_interest = (balance * rate * std_days) / 360
        std_bsmv = std_net_interest * 0.05
        std_total = std_net_interest + std_bsmv
        
        standard_total_days += std_days
        standard_total_interest += std_total
        
        print(f"Row {idx+5:<2} | {start_str:<10} | {end_str:<10} | {balance:<12,.2f} | {rate*100:<5.2f}% | {excel_days:<10} | {excel_total:<15,.2f} | {std_days:<10} | {std_total:<15,.2f}")
        
    print("-" * 115)
    print(f"{'TOTALS':<35} | Excel Days: {excel_total_days:<5} | Excel Interest: {excel_total_interest:,.2f} | Std Days: {standard_total_days:<5} | Std Interest: {standard_total_interest:,.2f}")
    
if __name__ == '__main__':
    compare_calculations()
