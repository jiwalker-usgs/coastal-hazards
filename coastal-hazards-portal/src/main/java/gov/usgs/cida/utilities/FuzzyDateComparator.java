package gov.usgs.cida.utilities;

import java.util.Comparator;
import java.util.Date;
/**
 * Implements "close enough" comparisons for dates.
 * This class is not consistent with Date.equals() and therefore should not be 
 * used to control the sort order of data structures like sorted sets and sorted
 * maps.
 * @see http://docs.oracle.com/javase/7/docs/api/java/util/Comparator.html
 */
public class FuzzyDateComparator implements Comparator<Date>{

	private long tolerance;
	public static final long DEFAULT_TOLERANCE = 1000;
	/**
	 * Specify a tolerance in milliseconds
	 * @param tolerance 
	 */
	public FuzzyDateComparator(long tolerance){
		this.tolerance = tolerance;
	}
	
	public FuzzyDateComparator(){
		this(DEFAULT_TOLERANCE);
	}
	
	@Override
	public int compare(Date o1, Date o2) {
		int compareValue = 0;
		long o1Time = o1.getTime();
		long o2Time = o2.getTime();
		long difference = o1Time - o2Time;
		if(Math.abs(difference) > tolerance){
			if(difference > 0){
				compareValue = 1;
			}
			else{
				compareValue = -1;
			}
		}
		return compareValue;
	}
	
}
