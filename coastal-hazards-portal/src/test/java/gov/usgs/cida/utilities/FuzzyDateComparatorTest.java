package gov.usgs.cida.utilities;

import java.util.Date;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 *
 * @author cschroed
 */
public class FuzzyDateComparatorTest {
	
	public static final long testTolerance = 2000;
	public static final FuzzyDateComparator fdc = new FuzzyDateComparator(testTolerance);
	public static final long start = 10000;
	public static final Date baseDate = new Date(start);
	
	
	public FuzzyDateComparatorTest() {
	}

	/**
	 * Test of compare method, of class FuzzyDateComparator.
	 */
	@Test
	public void testCompareSameObject() {
		
		//strict equality
		assertEquals(fdc.compare(baseDate, baseDate), 0);
	}
	@Test
	public void testCompareExactSameDate(){
		//effective equality
		Date equalToBaseDate = new Date(start);
		assertEquals(fdc.compare(baseDate, equalToBaseDate), 0);
	}
	@Test
	public void testCompareFuzzilySameDate(){
		//fuzzy equality
		Date fuzzilyEqualDate1 = new Date(start + testTolerance);
		assertEquals(fdc.compare(baseDate, fuzzilyEqualDate1), 0);
				
		Date fuzzilyEqualDate2 = new Date(start - testTolerance);
		assertEquals(fdc.compare(baseDate, fuzzilyEqualDate2), 0);
	}
	@Test
	public void testCompareNotSameDate(){
		//inequality
		Date notEqualDate1 = new Date(start + testTolerance + 1);
		assertEquals(fdc.compare(baseDate, notEqualDate1), -1);
				
		Date notEqualDate2 = new Date((start - testTolerance) - 1);
		assertEquals(fdc.compare(baseDate, notEqualDate2), 1);
	}
	
}
