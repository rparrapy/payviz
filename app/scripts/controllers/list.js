'use strict';

/**
 * @ngdoc function
 * @name payvizApp.controller:ListCtrl
 * @description
 * # ListCtrl
 * Controller of the payvizApp
 */
angular.module('payvizApp')
  .controller('ListCtrl', function ($scope, DTOptionsBuilder, DTColumnBuilder, DTColumnDefBuilder) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    $('.tips, .referencias, hr:last').hide();
    var liToSelect = 2;
    $(".nav.nav-pills li").removeClass("active");
    $(".nav.nav-pills li:eq("+(liToSelect-1)+")").addClass("active");

    // se clona el objeto para no afectar al grafico.
    var contratos = [];
    angular.copy(imputaciones, contratos);

    var maxElem = _.max(contratos, function(c){ return c.monto_total; });
    var minElem = _.min(contratos, function(c){ return c.monto_total; });
    var area = function(monto, montoTotal){
      var scale = d3.scale.sqrt().domain([0, montoTotal]).range([0, 125]);
      return scale(monto);
    }

    var ncontratos = []
    for (var i = 0; i < contratos.length; i++){
      var c = contratos[i];
      if(!c.monto_total){
        c.monto_total = _.reduce(c.imputaciones,function(sum, el) { return sum + el.monto },0);
      }
      if(!c.llamado_nombre){
        c.llamado_nombre = 'NO POSEE';
      }
      if(!c.cod_contrato){
        c.cod_contrato = 'NO POSEE';
      }
      c.radius = 125;
      c.is_adenda = false;
      var cobrado = _.reduce(c.imputaciones, function(sum, imputacion){
            return sum + imputacion.monto; 
        }, 0);
      var ejecutado = cobrado/c.monto_total;
      c.ejecutado = ejecutado.toFixed(2);
      c.monto_pagado = cobrado;
      ncontratos.push(c);

    }

    contratos = _.sortBy(ncontratos, function(o) { return o.llamado_nombre; });

    $scope.contratos = contratos;
    $scope.detalles_abiertos = [];

    $scope.dtOptions = DTOptionsBuilder.newOptions().withPaginationType('full_numbers')
      .withOption('order', [[2, 'asc']])
      .withOption('language', {
      "sProcessing":     "Procesando...",
      "sLengthMenu":     "Mostrar _MENU_ registros",
      "sZeroRecords":    "No se encontraron resultados",
      "sEmptyTable":     "Ningún dato disponible en esta tabla",
      "sInfo":           "Registros del _START_ al _END_ de un total de _TOTAL_ registros",
      "sInfoEmpty":      "Registros del 0 al 0 de un total de 0 registros",
      "sInfoFiltered":   "(filtrado de un total de _MAX_ registros)",
      "sInfoPostFix":    "",
      "sSearch":         "Buscar:",
      "sUrl":            "",
      "sInfoThousands":  ".",
      "sLoadingRecords": "Cargando...",
      "oPaginate": {
          "sFirst":    "Primero",
          "sLast":     "Último",
          "sNext":     "Siguiente",
          "sPrevious": "Anterior"
      },
      "thousands" : ".",
      "oAria": {
          "sSortAscending":  ": Activar para ordenar la columna de manera ascendente",
          "sSortDescending": ": Activar para ordenar la columna de manera descendente"
      }
    })
      .withBootstrap()
      .withOption('responsive', true)
      .withOption('fnDrawCallback', function(oSettings){  
        $(".img-mostrar").attr("src","images/ico_mostrar.png");
        $scope.detalles_abiertos = [];
      });



    $scope.dtColumnDefs = [
        DTColumnDefBuilder.newColumnDef(0).notSortable().withClass('details-control'),
        DTColumnDefBuilder.newColumnDef(5).renderWith(function(data, type, full) {

          return Number(data).toLocaleString();
        })
    ];

    $scope.$on('event:dataTableLoaded', function(event, loadedDT) {

      // Setup - add a text input to each footer cell
      var id = '#' + loadedDT.id;
      $(id + ' tfoot th:not(:first)').each(function() {
        var title = $(id + ' thead th').eq($(this).index()).text();
        $(this).html('<input class="form-control input-sm" style="font-size:smaller;max-width:100px;" type="text" placeholder="' + title + '" />');
      });

      var table = loadedDT.DataTable;
      // Apply the search
      table.columns().eq(0).each(function(colIdx) {
        $('input', table.column(colIdx).footer()).on('keyup change', function() {
          table
            .column(colIdx)
            .search(this.value)
            .draw();
        });
      });

    // si viene de una seleccion 
    if(window.seleccionado){
      var cod_contrato = window.seleccionado; 
      $("input[type=search]").val(cod_contrato);
      $("input[type=search]").keyup();
      $("img").click();
      window.seleccionado = null;

    }


    });


    function generarTablaDetalles(d){

      var s = '<h2>Detalle</h2>'+
      '<div style="overflow-y:scroll;max-height:400px;">'+
      '<table class="secundaria" style="margin-bottom:30px;width:100%;line-height: 1.2em;">'+
              '<thead>'+
                '<tr style="background:#ddd;">'+
                  '<td>Cod. contrato</td>'+
                  '<td>Fecha contrato</td>'+
                  '<td>Fecha de obligación</td>'+
                  '<td>Monto</td>'+
                '</tr>'+
              '</thead>'+
              '<tbody>'+
                '<tr class="item">'+
                  '<td><strong>'+d.cod_contrato+'</strong></td>'+
                  '<td>'+d.fecha_contrato+'</td>'+
                  '<td></td>'+
                  '<td></td>'+
                '</tr>'
                for(var i=0; i< d.imputaciones.length; i++){
                  var imp = d.imputaciones[i];
                  s+= '<tr>'+
                      '<td></td>'+
                      '<td></td>'+
                      '<td>'+imp.fecha_obl+'</td>'+
                      '<td style="text-align:right;">Gs. '+parseInt(imp.monto).toLocaleString()+'</td>'+
                    '</tr>';
                }
                if(_.has(d,'adendas')){
                    for(var j=0; j< d.adendas.length; j++){
                    var ad = d.adendas[j];
                    s+= '<tr class="item">'+
                        '<td><strong>'+ad.cod_contrato+'</strong></td>'+
                        '<td>'+ad.fecha_contrato+'</td>'+
                        '<td></td>'+
                        '<td></td>'+
                      '</tr>';
                   for(var k=0; k< ad.imputaciones.length; k++){
                      var impa = ad.imputaciones[k];
                      s+= '<tr>'+
                          '<td></td>'+
                          '<td></td>'+
                          '<td>'+impa.fecha_obl+'</td>'+
                          '<td style="text-align:right;">Gs. '+parseInt(impa.monto).toLocaleString()+'</td>'+
                        '</tr>';
                    }
                  }
                }

            s += '</tbody>'+
            '</table>'+
            '</div>';
      return s
    }

    function generarDiv(d){

      var html = " " + $("#template-detalle").html();


      html = html.replace('{categoria_nombre}', typeof d.categoria_nombre !== "undefined" ? d.categoria_nombre : 'No aplica')
                .replace('{monto_total}', typeof d.monto_total !== "undefined" ? parseInt(d.monto_total).toLocaleString() : 'No aplica')
                .replace('{ejecutado}', typeof d.ejecutado !== "undefined" ? (d.ejecutado * 100).toFixed(0) : '0')
                .replace('{pro_nombre}', typeof d.pro_nombre !== "undefined" ? d.pro_nombre : 'No aplica')
                .replace('{fecha_contrato}', typeof d.fecha_contrato !== "undefined" ? d.fecha_contrato : 'No aplica')
                .replace('{llamado_nombre}', typeof d.llamado_nombre !== "undefined" ? d.llamado_nombre : 'No aplica')
                .replace('{cod_contrato}', typeof d.cod_contrato !== "undefined" ? d.cod_contrato : 'No aplica')
                .replace('{monto_pagado}', typeof d.monto_pagado !== "undefined" ? d.monto_pagado.toLocaleString() : 'No aplica')
                .replace('{mod_nombre}', typeof d.mod_nombre !== "undefined" ? d.mod_nombre : 'No aplica')
                .replace('{id_svg}', typeof d.cod_contrato !== "undefined" ? d.cod_contrato : '1');
      if(_.has(d,'adendas')){
        html = html.replace('{id_timeline}', typeof d.cod_contrato !== "undefined" ? d.cod_contrato : '1')
                .replace('{titulo_adendas}', 'Adendas');
      }else{
        html = html.replace('{titulo_adendas}', '&nbsp;');
      }

      html += generarTablaDetalles(d);

      return html;



    }

    $scope.mostrarDetalle = function(c,id){

      if($scope.detalles_abiertos.indexOf(id) == -1){
        //console.log($scope.detalles_abiertos);
        //console.log(c,id);
        var html = generarDiv(c)
        $("#contrato-"+id).after('<tr class="detalle" id="detalle-'+id+'"><td colspan="7">'+ html +'</td></tr>');
        
        if( _.has(c,'adendas') )
          test(c.cod_contrato);
        
        $scope.detalles_abiertos.push(id);
        $("#img-mostrar-"+id).attr('src','images/ico_ocultar.png');
        //console.log(c);
        dibujar(c, id);
      }else{
        $scope.ocultarDetalles(id);
      }

    }

    $scope.ocultarDetalles = function(id){

      //console.log($scope.detalles_abiertos);
      $scope.detalles_abiertos = _.without($scope.detalles_abiertos,id);
      $("#detalle-"+id).remove();
      $("#img-mostrar-"+id).attr('src','images/ico_mostrar.png');

    }


    var fill = function(contrato, svg){

          var limite = moment();
          var cobrado = _.reduce(contrato.imputaciones, function(sum, imputacion){
            if(moment(imputacion.fecha_obl) <= limite){
              return sum + imputacion.monto; 
            }else{
              return sum;
            }
          }, 0);
          var ejecutado = cobrado/contrato.monto_total;
          var fillColor = contrato.is_adenda ? '#00698C' : '#f56727' ;
          var bgColor = contrato.is_adenda ? '#bfdfff' : '#ffead4';
          var gradientId = 'grad-' + contrato.cod_contrato + '-detail';

          //Agrego aca, pero deberiamos hacer en otra parte
          contrato.ejecutado = ejecutado.toFixed(2);
          contrato.monto_pagado = cobrado;

          //var imgId = 'img-' +  contrato.cod_contrato;
          //var imagen = $('#' + imgId);
          //imagen.show();


          var grad = svg.append('defs').append('linearGradient').attr('id', gradientId)
          .attr('x1', '0%').attr('x2', '0%').attr('y1', '100%').attr('y2', '0%');
          grad.append('stop').attr('class', 'color').attr('offset', ejecutado.toFixed(2)).style('stop-color', fillColor);
          grad.append('stop').attr('class', 'blank').attr('offset', ejecutado.toFixed(2)).style('stop-color', bgColor);  

          return 'url(#' + gradientId + ')';
    };

    var imagen = function(contrato, svg, w, h){


          var imgId = 'img-' +  contrato.cod_contrato + '-detail';
          var imagen = d3.select('#' + imgId );

          if(_.has(contrato,'adendas')){
            var x  = w/2 - contrato.radius * 0.25;
            var y = h/2 - contrato.radius * 0.25;
            //x = x > w/2 ? w/2 : x;
            //y = y > w/2 ? w/2 : y;
            imagen = svg
              .append('image')
              .attr('id', imgId)
              .attr('xlink:href', 'images/ico_dinero.png')
              .attr('width', contrato.radius * 0.5)
              .attr('height', contrato.radius * 0.5)
              .attr('x', x)
              .attr('y', y);
          }
    };
    

    var stroke = function(contrato){
          return contrato.is_adenda ? '#006289' : '#ca4600';
    };

    function setPosAdenda(d, w, h){
          if(d.p_data){
            var angulos = [0,72,150,216,288,360];

            d.x = w/2 + Math.cos( (angulos[d.pos] * 180 ) / Math.PI ) * d.p_data.radius;
            d.y = h/2 - Math.sin( (angulos[d.pos] * 180 ) / Math.PI ) * d.p_data.radius; 
          }
    }

    function dibujar(c, id){

      var circulo = [c];
      c.radius = 125;
      if(_.has(c,'adendas')){
        var adendas = c.adendas;
              for(var i=0; i < adendas.length; i++){
                adendas[i].p_data = c;
                adendas[i].monto_total = adendas[i].monto;
                adendas[i].radius = area(adendas[i].monto_total, c.monto_total);
                adendas[i].pos = i;
                adendas[i].is_adenda = true;
                circulo.push(adendas[i]);
              }
      }
      var threeColumns = $('thead tr th:not(.sorting_disabled):lt(3)');
      var width = _.reduce(threeColumns, function(memo, num){ return memo + $(num).outerWidth(); }, 0);
      var height = $('.detalle .right').height();
      d3.select("#svg-"+ c.cod_contrato + " svg").remove();
      var svgContainer = d3.select("#svg-"+c.cod_contrato).append("svg:svg").attr("width", width).attr("height", height);
      var circles = svgContainer.selectAll("circle")
                          .data(circulo)
                          .enter()
                          .append("circle");
      var circleAttributes = circles
                       .attr("cx", function (d) { if(d.is_adenda){ setPosAdenda(d, width, height); return d.x; }; return width/2; })
                       .attr("cy", function (d) { if(d.is_adenda){ setPosAdenda(d, width, height); return d.y; }; return height/2; })
                       .attr("r", function (d) { return d.radius; })
                       .attr('stroke', function(d){ return stroke(d); })
                       .style("fill", function(d) { imagen(d, svgContainer, width, height); return fill(d,svgContainer); });

    }


    function test(id) {

       //adendas de dinero
      var events = [
      {dates: [new Date(2011, 2, 31), new Date(2011, 12, 30)], title: "Monto inicial", description: "Gs. 000.000.000", section: 0},
      {dates: [new Date(2011, 10, 31), new Date(2012, 3, 30)], title: "Adenda", description: "+ Gs. 000.000.000", section: 0},
      {dates: [new Date(2011, 4, 1)], title: "Pago", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      {dates: [new Date(2011, 5, 1)], title: "Pago", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      {dates: [new Date(2011, 11, 1)], title: "Pago", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      {dates: [new Date(2011, 11, 1)], title: "Pago Adenda", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      {dates: [new Date(2011, 12, 1)], title: "Pago Adenda", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      ];

      //adendas de tiempo
      var sections = [
      {dates: [new Date(2011, 2, 31), new Date(2011, 9, 30)], title: "Tiempo incial de contrato", section: 0, attrs: {fill: "#FFDFBF"}},
      {dates: [new Date(2011, 9, 30), new Date(2011, 10, 30)], title: "Adenta de tiempo +30 días", section: 1, attrs: {fill: "#FFE9D4"}},
      {dates: [new Date(2011, 10, 30), new Date(2011, 11, 30)], title: "Adenta de tiempo +30 días", section: 2, attrs: {fill: "#FFDFBF"}},
      {dates: [new Date(2011, 11, 30), new Date(2012, 12, 30)], title: "Adenta de tiempo +30 días", section: 3, attrs: {fill: "#FFE9D4"}}
      ];
       //console.log("Timeline:");
       console.log(id);
       var timeline1 = new Chronoline(document.getElementById("target-"+id), events,
        {
          visibleSpan: DAY_IN_MILLISECONDS * 366,
          animated: true,
          tooltips: true,
          defaultStartDate: new Date(2011, 1, 15),
          sections: sections,
          sectionLabelAttrs: {'fill': '#333', 'font-weight': 'bold'},
          labelInterval: isHalfMonth,
          hashInterval: isHalfMonth,
          scrollLeft: prevQuarter,
          scrollRight: nextQuarter,
          floatingSubLabels: true,
          draggable: true,
          width : 800
      });

    }



    //$scope.$apply();
  });
