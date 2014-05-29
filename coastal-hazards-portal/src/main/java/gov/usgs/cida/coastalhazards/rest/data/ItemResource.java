package gov.usgs.cida.coastalhazards.rest.data;

import com.sun.jersey.api.NotFoundException;
import gov.usgs.cida.coastalhazards.exception.BadRequestException;
import gov.usgs.cida.coastalhazards.exception.UnauthorizedException;
import gov.usgs.cida.coastalhazards.gson.GsonUtil;
import gov.usgs.cida.coastalhazards.jpa.ItemManager;
import gov.usgs.cida.coastalhazards.model.Item;
import gov.usgs.cida.coastalhazards.oid.session.SessionResource;
import gov.usgs.cida.coastalhazards.rest.data.util.HttpUtil;
import gov.usgs.cida.coastalhazards.rest.data.util.ItemUtil;
import gov.usgs.cida.utilities.FuzzyDateComparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.PathParam;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.Path;
import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;
import org.apache.http.impl.cookie.DateParseException;
import org.apache.http.impl.cookie.DateUtils;

/**
 * 
 *
 * @author jordan
 */
@Path("item")
public class ItemResource {
    
	/**
	 * Retrieves representation of an instance of gov.usgs.cida.coastalhazards.model.Item
	 *
	 * @param id identifier of requested item
     * @param subtree whether to return all items below this as a subtree
     * @param clientItemDateString if modified since date string
	 * @return JSON representation of the item(s)
	 */
	@GET
	@Path("{id}")
	@Produces(MediaType.APPLICATION_JSON)
	public Response getItem(@PathParam("id") String id,
            @DefaultValue("false") @QueryParam("subtree") boolean subtree,
            @HeaderParam(HttpHeaders.IF_MODIFIED_SINCE) String clientItemDateString) {
        Response response = null;
        try (ItemManager itemManager = new ItemManager()) {
            Item item = itemManager.load(id);
            if (item == null) {
                throw new NotFoundException();
            } else {
                
                Date clientItemDate = null;
				if (null != clientItemDateString) {
					try {
						clientItemDate = DateUtils.parseDate(clientItemDateString);
					}
                    catch (DateParseException e) {
						//we must do nothing according to the spec:
						//"if the passed If-Modified-Since date is
						//invalid, the response is exactly the same as for a normal GET"
						//@see http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.25
					}
				}
                
                Date serverItemDate = null;
                if (subtree) {
                    Item lastModifiedItem = ItemUtil.gatherNewest(item);
                    serverItemDate = lastModifiedItem.getLastUpdate();
                } else {
                    serverItemDate = item.getLastUpdate();
                }
                FuzzyDateComparator fuzzyDateComparator = new FuzzyDateComparator();
				
				if (clientItemDate != null && 0 == fuzzyDateComparator.compare(clientItemDate, serverItemDate)) {
					response = Response.notModified().build();
				} else {
					String jsonResult = item.toJSON(subtree);
					ResponseBuilder responseBuilder = Response.ok(jsonResult, MediaType.APPLICATION_JSON_TYPE);
					String httpDate = HttpUtil.getDateAsHttpDate(serverItemDate);
					responseBuilder.header(HttpHeaders.LAST_MODIFIED, httpDate);
					response = responseBuilder.build();
				}
            }
        }
        return response;
    }
	
	@GET
	@Produces(MediaType.APPLICATION_JSON)
	public Response searchItems(
            @DefaultValue("") @QueryParam("query") List<String> query,
            @DefaultValue("") @QueryParam("type") List<String> type,
			@DefaultValue("popularity") @QueryParam("sortBy") String sortBy,
			@DefaultValue("-1") @QueryParam("count") int count,
			@DefaultValue("") @QueryParam("bbox") String bbox,
            @DefaultValue("false") @QueryParam("subtree") boolean subtree,
            @DefaultValue("false") @QueryParam("showDisabled") boolean showDisabled) {
		// need to figure out how to search popularity and bbox yet
        Response response = null;
        try (ItemManager itemManager = new ItemManager()) {
            String jsonResult = itemManager.query(query, type, sortBy, count, bbox, subtree, showDisabled);
            response = Response.ok(jsonResult, MediaType.APPLICATION_JSON_TYPE).build();
        }
        return response;
	}

	/**
	 * Only allows one card to be posted at a time for now
	 *
	 * @param content Posted content as text string (should be JSON)
     * @param request passed through context of request
	 * @return
	 */
	@POST
	@Consumes(MediaType.APPLICATION_JSON)
	@Produces(MediaType.APPLICATION_JSON)
	public Response postItem(String content, @Context HttpServletRequest request) {
        Response response;
        if (SessionResource.isValidSession(request)) {
            try (ItemManager itemManager = new ItemManager()) {
                Item item = Item.fromJSON(content);
                final String id = itemManager.persist(item);
                if (null == id) {
                    throw new BadRequestException();
                } else {
                    Map<String, Object> ok = new HashMap<String, Object>() {
                        private static final long serialVersionUID = 2398472L;
                        {
                            put("id", id);
                        }
                    };
                    response = Response.ok(GsonUtil.getDefault().toJson(ok, HashMap.class), MediaType.APPLICATION_JSON_TYPE).build();
                }
            }
        } else {
            throw new UnauthorizedException();
        }
		return response;
	}
    
    /**
     * @param request
     * @param id
     * @param content
     * @return 
     */
    @PUT
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateItem(@Context HttpServletRequest request, @PathParam("id") String id, String content) {
        Response response = null;
        if (SessionResource.isValidSession(request)) {
            try (ItemManager itemManager = new ItemManager()) {
                Item dbItem = itemManager.load(id);
                Item updatedItem = Item.fromJSON(content);
                Item mergedItem = Item.copyValues(updatedItem, dbItem);
                final String mergedId = itemManager.merge(mergedItem);
                if (null != mergedId) {
                    response = Response.ok().build();
                } else {
                    throw new BadRequestException();
                }
            }
        } else {
            throw new UnauthorizedException();
        }
        return response;
    }
    
    @DELETE
    @Path("{id}")
    public Response deleteItem(@Context HttpServletRequest request, @PathParam("id") String id) {
        Response response = null;
        if (SessionResource.isValidSession(request)) {
            try (ItemManager itemManager = new ItemManager()) {
                if (itemManager.delete(id)) {
                    response = Response.ok().build();
                } else {
                    throw new Error();
                }
            }
        } else {
            throw new UnauthorizedException();
        }
        return response;
    }
    
    /**
     * Run the cycle check before attempting POST or PUT to verify item would not introduce cycle
     * @param parentId aggregation item to check
     * @param childId child item being added to parent item
     * @return JSON response with true or false
     */
    @GET
    @Path("cycle/{parentId}/{childId}")
    public Response checkForCycle(@PathParam("parentId") String parentId, @PathParam("childId") String childId) {
        Response response = null;
        try (ItemManager itemManager = new ItemManager()) {
            boolean cycle = itemManager.isCycle(parentId, childId);
            response = Response.ok("{\"cycle\": " + cycle + "}", MediaType.APPLICATION_JSON_TYPE).build();
        }
        return response;
    }
}