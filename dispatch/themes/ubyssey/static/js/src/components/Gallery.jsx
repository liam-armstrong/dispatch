var React = require('react');
var LinkedList = require('../modules/LinkedList.js');
var GallerySlide = require('./GallerySlide.jsx');
var Hammer = require('hammerjs');

var Gallery = React.createClass({
    getInitialState: function(){
        return {
            active: null,
            index: false,
            image: false,
            visible: false,
            deltax: 0
        }
    },
    componentWillMount: function(){
        this.images = LinkedList(this.props.images);
    },
    componentDidMount: function(){

        //this.preloadImages();

        var myElement = React.findDOMNode(this);
        this.toucharea = new Hammer(myElement);

        var base = -($(window).width());
        var left = 0;

        this.toucharea.on("panmove", function(event){
            left = base + event.deltaX;
            $('.slides').css({
                'left': left,
                'padding-left': $(window).width()
            });
            //this.refs.slides.style.left = event.deltaX;
        }.bind(this));

        this.toucharea.on("panend", function(event){
            var pos = 0;
            var callback;

            if(Math.abs(left) > $(window).width() / 3){
                if(left < 0){
                    callback = this.next;
                    pos = -($(window).width());
                } else {
                    callback = this.prev;
                    pos = $(window).width();
                }
            }

            $('.slides').animate({ left: base + pos }, 250, function(){
                console.log('test');
                callback();
            });
        }.bind(this));

        this.addSlideTrigger(this.props.trigger);
        this.setupEventListeners();
    },
    setupEventListeners: function(){

        // Keyboard controls
        key('left', this.previous);
        key('right', this.next);
        key('esc', this.close);

        // Arrow buttons
        $(document).on('click', '.prev-slide', function(e){
            e.preventDefault();
            this.previous();
        }.bind(this));
        $(document).on('click', '.next-slide', function(e){
            e.preventDefault();
            this.next();
        }.bind(this));

        // Clicking outside container
        $(this.getDOMNode()).mouseup(function (e)
        {
            var container = $(this.getDOMNode()).find(".slide");
            if (!container.is(e.target) && container.has(e.target).length === 0)
            {
                this.close();
                $('body').removeClass('no-scroll');
            }
        }.bind(this));

    },
    addSlideTrigger: function(target){
        console.log('adding slide trigger for ' + target);
        $(target).on('click', function(e){
            e.preventDefault();
            var image_id = $(e.target).data("id");

            if(this.state.visible){
                this.close();
            } else {
                this.open(image_id);
            }

        }.bind(this));
    },
    setIndex: function(index){
        var attachment = this.props.images[index];
        this.setState({
            index: index,
            image: attachment.url,
            caption: attachment.caption,
        });
    },
    preloadImages: function(){
        var loaded = [];
        this.props.images.map(function(image, i){
            loaded[i] = new Image();
            loaded[i].src = image.url;
        });
    },
    getImage: function(imageId){
        var index = this.props.imagesTable[imageId];
        return this.props.images[index];
    },
    getActiveImage: function(imageId){
        console.log('finding image');
        console.log(this.images);
        var active = this.images;
        while(active){
            if(active.data.id == imageId)
                return active;
            active = active.next;
        }
        return null;
    },
    setCurrentImage: function(imageId){
        this.setState({ active: this.getActiveImage(imageId)});
    },
    open: function(imageId){
        this.setCurrentImage(imageId);
        this.setState({ visible: true });
        $('body').addClass('no-scroll');
    },
    close: function(){
        this.setState({
            visible: false,
        });
        $('body').removeClass('no-scroll');
    },
    previous: function(){
        if(!this.state.active || !this.state.active.prev)
            return
        this.setState({ active: this.state.active.prev });
    },
    next: function(){
        if(!this.state.active || !this.state.active.next)
            return
        this.setState({ active: this.state.active.next });
    },
    renderImage: function(){
        if(this.state.image){
            var imageStyle = { maxHeight: $(window).height() - 200 };
            return (
                <div className="slide">
                    <img className="slide-image" style={imageStyle} src={this.state.image} />
                    <p className="slide-caption">{this.state.caption}</p>
                    {this.renderControls()}
                </div>
            );
        }
    },
    renderControls: function(){
        if(this.props.images.length > 1){
            return (
                <div className="navigation">
                    <a className="prev-slide" href="#"><i className="fa fa-chevron-left"></i></a>
                    <span className="curr-slide">{this.state.index + 1}</span> &nbsp;of&nbsp; <span className="total-slide">{this.props.images.length}</span>
                    <a className="next-slide" href="#"><i className="fa fa-chevron-right"></i></a>
                </div>
            );
        }
    },
    renderSlides: function(){
        //var slidesStyle = { left: -($(window).width()) + this.state.deltax };

        return (
            <div className="image-inner">
                <div className="slides" ref="slides">
                {this.state.active.prev ? this.renderSlide(this.state.active.prev, 'prev') : null}
                {this.state.active ? this.renderSlide(this.state.active, 'active') : null}
                {this.state.active.next ? this.renderSlide(this.state.active.next, 'next') : null}
                </div>
            </div>
            );
    },
    renderSlide: function(active, className){
        var image = active.data;
        return (<GallerySlide className={className} src={image.url} caption={image.caption} />);
    },
    render: function() {
        if(this.state.visible){
            var visible = "visible";
        } else {
            var visible = "";
        }
        return (
            <div className={'slideshow ' + visible}>
                <div className="image-container">
                {this.state.active ? this.renderSlides() : null}
                </div>
            </div>
        );
    }
});

module.exports = Gallery;