# Handler Template

```go
// @Summary      Short description
// @Description  Longer description
// @Tags         domain
// @Accept       json
// @Produce      json
// @Param        request body    dto.CreateThingRequest true "Request body"
// @Success      201     {object} dto.CreateThingResponse
// @Failure      400     {object} common.ErrorResponse
// @Failure      401     {object} common.ErrorResponse
// @Router       /api/v1/things [post]
func (h *ThingHandler) Create(c *gin.Context) {
    var req dto.CreateThingRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        common.HandleError(c, appcommon.NewValidationError(err))
        return
    }

    result, err := h.service.Create(c.Request.Context(), req)
    if err != nil {
        common.HandleError(c, err)
        return
    }

    c.JSON(http.StatusCreated, gin.H{"data": result})
}
```
