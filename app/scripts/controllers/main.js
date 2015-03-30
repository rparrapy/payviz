'use strict';

/**
 * @ngdoc function
 * @name payvizApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the payvizApp
 */
angular.module('payvizApp')
  .factory('serviceImputaciones',function($http){
    var getData = function() {

        return $http({method:"GET", url:"http://demo3867734.mockable.io/imputaciones"}).then(function(result){
            //return result.data;
            var c = []
            angular.copy(imputaciones, c)
            return c;
        }).catch(function(result){
          //console.log('Error', result.status,result.data);
          var c = []
          angular.copy(imputaciones, c)
          return c;
        });
    };
    return { getData: getData };
  })
  .controller('MainCtrl', function ($scope,serviceImputaciones) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    $('.tips, .referencias, hr:last').show();
    //Keep active nav-pill updated
    $(document).ready(function() {
      $(".nav.nav-pills li").on("click",function(){
        //Fix routing problem inside iframe
        var url = $(this).children().first()[0].href;
        window.location = url;
      });
    });

    $scope.data = null;
    $scope.loaded = false;
    var myDataPromise = serviceImputaciones.getData();
    myDataPromise.then(function(result) {  // this is only run after $http completes
       //$scope.data = result;
       //console.log(result);


    //var contratos = [];
    //angular.copy(imputaciones, contratos);
    window.imputaciones = result;
    var contratos = result;
    /*var conAmbasAdendas = _.filter(contratos, function(c){
      var adendasMonto = _.filter(c.adendas, function(a){ return (a.tipo === 'Amp de monto' || a.tipo === 'Reajuste.' || a.tipo === 'Renovación'); });
      var adendasPlazo = _.filter(c.adendas, function(a){ return (a.tipo === 'Amp de plazos'); });
      if(adendasPlazo.length > 0 && adendasMonto.length > 0){ console.log(c.adendas); }
      return adendasPlazo.length > 0 && adendasMonto.length > 0;
    });
    console.log(conAmbasAdendas);*/

    for (var i = 0; i < contratos.length; i++){
      var c = contratos[i];
      if(!c.monto_total){
        c.monto_total = _.reduce(c.imputaciones,function(sum, el) { return sum + el.monto },0);
      }
      if(!c.fecha_contrato){
        c.fecha_primer_pago = _.sortBy(c.imputaciones, function(i){ return moment(i.fecha_contrato); })[0];
      }
      //temporalmente
      c.adendas = _.filter(c.adendas, function(adenda){
        return (adenda.tipo === 'Amp de monto' || adenda.tipo === 'Reajuste.' || adenda.tipo === 'Renovación' || adenda.tipo === 'Amp de plazos') && adenda['fecha_contrato'];
      });
    }


    $scope.data = contratos;
    $scope.loaded = true;
    //$scope.$apply();
    });

  });
