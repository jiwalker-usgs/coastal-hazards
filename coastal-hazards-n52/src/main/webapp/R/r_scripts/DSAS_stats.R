# wps.des: id=DSAS_stats, title=Digital Shoreline Analysis System Stats, abstract=stats available - LRR, WLR, SCE, NSM;
# wps.in: input, xml, block intersection text, text input from intersections layer with time elements and uncertainty;

# input is unique identifier for WPS, is a variable in R (will contain all parser text)
# xml is for WPS side of things, tells WPS how input should be formatted

input <- "testOut.txt"



fileN = input # will have input as a string (long string read in)
reader = c("character","numeric","numeric")
conLevel = 0.95
zRepV  = 0.01 #replace value for when the uncertainty is zero

hNum = 2 # number of header lines in each block ** should be 1 now **
ignoreStr = c("dist","uncy") # kill for JW....
c <- file(fileN,"r") #

t_i = 1 # time index
d_i = 2 # distance index
u_i = 3 # uncertainty index

nRead <- length(readLines(c))

# get block starts
blockI <- vector(length=nRead)
blckNm <- vector(length=nRead)
seek(con=c,where=0)
for (p in 1:nRead){
    r1 <- readLines(c,n=1) # read in all of file, line by line raw
    if (substring(r1,1,1) == '#') {
        blockI[p] = p
        blckNm[p] = substring(r1,3,)
    }
}

close(c)
print('getting blocks')
# get block starts and number of blocks
rmvI <- (blockI==0)
blockI = blockI[!rmvI]
blckNm = blckNm[!rmvI]
numBlck= length(blockI)

LRR_rates   <- vector(length=numBlck)
LCI         <- vector(length=numBlck)
WLR_rates   <- vector(length=numBlck)
WCI			<- vector(length=numBlck)
SCE_rates   <- vector(length=numBlck)
NSM_rates   <- vector(length=numBlck)
EPR_rates   <- vector(length=numBlck)

transect_ID <- blckNm

statsout <-data.frame(transect_ID,LRR_rates,LCI,WLR_rates,WCI,SCE_rates,NSM_rates,EPR_rates)
colnames(statsout)<-c('transect_ID','LRR','LCI','WLR','WCI','SCE','NSM','EPR')


for (b in 1:numBlck){
    if (b==numBlck) enI = nRead-1
    else enI = blockI[b+1]-1
    stI = blockI[b]+hNum
    
    numLines = enI-stI+1
    # -- read in data according to data classes in reader
    data <- read.table(fileN, sep="\t", header=FALSE, na.strings = ignoreStr, colClasses=reader,skip=stI-1)
    data <-data[1:numLines,]
    dates <- as.Date(data[,t_i],format="%Y-%m-%d")
    useI  <- which(!is.na(dates))
    
    dates <- dates[useI]
    data  <- data[useI,]
    zerI  <- which(data[,u_i]==0,arr.ind = T)

    if (length(dates) > 2){
        data[zerI,u_i] = zRepV
        distance = data[,d_i]
        uncy     = data[,u_i]
        
        #intersections = data.frame(dates,distance,uncy,stringsAsFactors = FALSE)
        # call LRR
            rate <- dates
            mdl <- lm(formula=distance~rate)
            coef <- coefficients(mdl)
            CI   <- confint(mdl,"rate",level=conLevel)
            rate <- coef["rate"]	# is m/day
        
        statsout[b,2] <- rate*365.25
        statsout[b,3] <- (CI[2]-CI[1])/2 # LCI
        
        weights <- 1/(uncy^2)
        rate <- dates
        mdl <- lm(formula=distance~rate, weights=weights)
        coef <- coefficients(mdl)
        CI   <- confint(mdl,"rate",level=conLevel)
        rate <- coef["rate"]
        statsout[b,4] <- rate*365.25
        statsout[b,5] <- (CI[2]-CI[1])/2 # WCI
		
		SCE <- max(distance)-min(distance)
		NSM <- 0 # should be which.max...
		EPR <- 0 # should be NSM/(max(dates)-min(dates))
		statsout[b,6] <- SCE
		statsout[b,7] <- NSM
		statsout[b,8] <- EPR
		
        
    }
    
}
# output is an identifier and R variable (WPS identifier). The ouput is the name of the text file
# wps.out: output, text, output title, tabular output data to append to shapefile;
output = "output.txt"
write.table(statsout,file="output.txt",col.names=TRUE, quote=FALSE, row.names=FALSE, sep="\t")
